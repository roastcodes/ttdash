import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import sampleUsage from '../../examples/sample-usage.json'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
} from '@/lib/dashboard-preferences'
import {
  createSharedServerContext,
  fetchTrusted,
  getCliDataDir,
  getCliConfigDir,
  hasTypst,
  permissionBits,
  registerSharedServerLifecycle,
  sendRawHttpRequest,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'

const sharedServer = createSharedServerContext()
registerSharedServerLifecycle(sharedServer)

const itIfTypst = hasTypst ? it : it.skip

describe('local server API', () => {
  it('serves the upload, usage, settings, and delete flow against real persisted files', async () => {
    const initialUsageResponse = await fetch(`${sharedServer.baseUrl}/api/usage`)
    expect(initialUsageResponse.status).toBe(200)
    expect(await initialUsageResponse.json()).toEqual({
      daily: [],
      totals: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalCost: 0,
        totalTokens: 0,
        requestCount: 0,
      },
    })

    const initialSettingsResponse = await fetch(`${sharedServer.baseUrl}/api/settings`)
    expect(initialSettingsResponse.status).toBe(200)
    expect(await initialSettingsResponse.json()).toMatchObject({
      language: 'de',
      theme: 'dark',
      reducedMotionPreference: 'system',
      providerLimits: {},
      defaultFilters: DEFAULT_DASHBOARD_FILTERS,
      sectionVisibility: {
        insights: true,
        metrics: true,
        today: true,
        currentMonth: true,
        activity: true,
        forecastCache: true,
        limits: true,
        costAnalysis: true,
        tokenAnalysis: true,
        requestAnalysis: true,
        advancedAnalysis: true,
        comparisons: true,
        tables: true,
      },
      sectionOrder: getDefaultDashboardSectionOrder(),
      lastLoadedAt: null,
      lastLoadSource: null,
      cliAutoLoadActive: false,
    })

    const uploadResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })

    expect(uploadResponse.status).toBe(200)
    const uploadBody = await uploadResponse.json()
    expect(uploadBody.days).toBe(5)
    expect(uploadBody.totalCost).toBeCloseTo(19.87, 6)

    const usageResponse = await fetch(`${sharedServer.baseUrl}/api/usage`)
    const usageBody = await usageResponse.json()
    expect(usageResponse.status).toBe(200)
    expect(usageBody.daily).toHaveLength(5)
    expect(usageBody.totals.totalCost).toBeCloseTo(19.87, 6)

    const afterUploadSettingsResponse = await fetch(`${sharedServer.baseUrl}/api/settings`)
    const afterUploadSettings = await afterUploadSettingsResponse.json()
    expect(afterUploadSettings.lastLoadSource).toBe('file')
    expect(afterUploadSettings.lastLoadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const patchResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'en',
        theme: 'light',
        reducedMotionPreference: 'always',
        providerLimits: {
          OpenAI: {
            hasSubscription: true,
            subscriptionPrice: 19.999,
            monthlyLimit: 500.555,
          },
        },
        defaultFilters: {
          viewMode: 'monthly',
          datePreset: '30d',
          providers: ['OpenAI'],
          models: ['GPT-5.4'],
        },
        sectionVisibility: {
          tokenAnalysis: false,
          comparisons: false,
        },
        sectionOrder: ['metrics', 'insights', 'today'],
      }),
    })

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      language: 'en',
      theme: 'light',
      reducedMotionPreference: 'always',
      providerLimits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 20,
          monthlyLimit: 500.56,
        },
      },
      defaultFilters: {
        viewMode: 'monthly',
        datePreset: '30d',
        providers: ['OpenAI'],
        models: ['GPT-5.4'],
      },
      sectionVisibility: {
        tokenAnalysis: false,
        comparisons: false,
        insights: true,
      },
      sectionOrder: [
        'metrics',
        'insights',
        'today',
        'currentMonth',
        'activity',
        'forecastCache',
        'limits',
        'costAnalysis',
        'tokenAnalysis',
        'requestAnalysis',
        'advancedAnalysis',
        'comparisons',
        'tables',
      ],
      cliAutoLoadActive: false,
    })

    const deleteResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ success: true })

    const finalUsageResponse = await fetch(`${sharedServer.baseUrl}/api/usage`)
    const finalUsage = await finalUsageResponse.json()
    expect(finalUsage.daily).toEqual([])
    expect(finalUsage.totals.totalCost).toBe(0)
  })

  it('rejects untrusted mutation requests, enforces JSON bodies, and blocks auto-import GET requests', async () => {
    const wrongContentTypeResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(sampleUsage),
    })
    expect(wrongContentTypeResponse.status).toBe(415)

    const crossSiteUploadResponse = await fetch(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify(sampleUsage),
    })
    expect(crossSiteUploadResponse.status).toBe(403)

    const crossSiteDeleteResponse = await fetch(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
      headers: { Origin: 'https://evil.example' },
    })
    expect(crossSiteDeleteResponse.status).toBe(403)

    const missingOriginDeleteResponse = await fetch(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
    })
    expect(missingOriginDeleteResponse.status).toBe(403)

    const autoImportGetResponse = await fetch(`${sharedServer.baseUrl}/api/auto-import/stream`)
    expect(autoImportGetResponse.status).toBe(405)
  })

  it('rejects untrusted host headers before route handling', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      [
        'DELETE /api/usage HTTP/1.1',
        'Host: evil.example',
        'Origin: http://evil.example',
        'Connection: close',
        '',
        '',
      ].join('\r\n'),
    )

    expect(rawResponse.startsWith('HTTP/1.1 403 Forbidden')).toBe(true)
    expect(rawResponse).toContain('{"message":"Untrusted host header"}')
  })

  it('serves the API only from the configured API prefix', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-api-prefix-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null
    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: { API_PREFIX: '/custom-api' },
        readinessPath: '/custom-api/usage',
      })

      expect((await fetch(`${standaloneServer.url}/custom-api/usage`)).status).toBe(200)
      expect((await fetch(`${standaloneServer.url}/api/usage`)).status).toBe(404)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('imports settings backups and merges usage backups without overwriting conflicting local days', async () => {
    const seedResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(seedResponse.status).toBe(200)

    const settingsImportResponse = await fetchTrusted(
      `${sharedServer.baseUrl}/api/settings/import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'ttdash-settings-backup',
          version: 1,
          settings: {
            language: 'de',
            theme: 'light',
            reducedMotionPreference: 'never',
            providerLimits: {
              Anthropic: {
                hasSubscription: true,
                subscriptionPrice: 21.499,
                monthlyLimit: 300.111,
              },
            },
            defaultFilters: {
              viewMode: 'yearly',
              datePreset: 'year',
              providers: ['Anthropic'],
              models: ['Claude Sonnet 4.5'],
            },
            sectionVisibility: {
              tables: false,
              advancedAnalysis: false,
            },
            sectionOrder: ['tables', 'metrics', 'insights'],
            lastLoadedAt: '2026-04-01T12:30:00.000Z',
            lastLoadSource: 'file',
          },
        }),
      },
    )
    expect(settingsImportResponse.status).toBe(200)

    const newImportedDay = { ...sampleUsage.daily[0], date: '2026-03-31' }
    const usageImportResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-usage-backup',
        version: 1,
        data: {
          daily: [
            sampleUsage.daily[0],
            {
              ...sampleUsage.daily[1],
              totalCost: 999,
              modelBreakdowns: sampleUsage.daily[1].modelBreakdowns.map((entry, index) =>
                index === 0 ? { ...entry, cost: 997 } : entry,
              ),
            },
            newImportedDay,
          ],
        },
      }),
    })

    expect(usageImportResponse.status).toBe(200)
    expect(await usageImportResponse.json()).toEqual({
      importedDays: 3,
      addedDays: 1,
      unchangedDays: 1,
      conflictingDays: 1,
      totalDays: 6,
    })
  })

  it('rejects unrelated JSON and wrong backup types for settings import', async () => {
    const invalidPayloadResponse = await fetchTrusted(
      `${sharedServer.baseUrl}/api/settings/import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foo: 'bar' }),
      },
    )
    expect(invalidPayloadResponse.status).toBe(400)

    const usageBackupResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-usage-backup',
        version: 1,
        data: sampleUsage,
      }),
    })
    expect(usageBackupResponse.status).toBe(400)
  })

  it('resets persisted settings to defaults via DELETE /api/settings', async () => {
    const patchResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'en',
        theme: 'light',
        reducedMotionPreference: 'always',
      }),
    })
    expect(patchResponse.status).toBe(200)

    const deleteResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/settings`, {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toMatchObject({
      success: true,
      settings: {
        language: 'de',
        theme: 'dark',
        reducedMotionPreference: 'system',
      },
    })
  })

  it('rejects report generation when no usage data exists', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/usage`, { method: 'DELETE' })
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewMode: 'daily' }),
    })
    expect(response.status).toBe(400)
  })

  itIfTypst('generates a PDF report for valid requests', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })

    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewMode: 'daily',
        language: 'en',
        selectedProviders: ['OpenAI'],
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
  })

  it('rejects malformed report payloads before report generation starts', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"viewMode":"daily"',
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for malformed request paths without crashing the server', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      'GET /%E0%A4%A HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )

    expect(rawResponse.startsWith('HTTP/1.1 400 Bad Request')).toBe(true)
  })

  it('returns only the runtime metadata that the app still needs', async () => {
    const runtimeResponse = await fetch(`${sharedServer.baseUrl}/api/runtime`)
    expect(runtimeResponse.status).toBe(200)
    expect(await runtimeResponse.json()).toEqual({
      id: expect.any(String),
      mode: 'foreground',
      port: Number(new URL(sharedServer.baseUrl).port),
      url: sharedServer.baseUrl,
    })
  })

  it('rejects null-byte static paths without crashing the server', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      'GET /%00/etc/passwd HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )

    expect(rawResponse.startsWith('HTTP/1.1 400 Bad Request')).toBe(true)
  })

  it('returns 413 for oversized upload payloads instead of resetting the connection', async () => {
    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })
    expect(response.status).toBe(413)
  })

  it('returns 413 for oversized report payloads instead of resetting the connection', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })
    expect(response.status).toBe(413)
  })

  it('keeps explicit runtime dir overrides independent', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-runtime-dir-test-'))
    const explicitConfigDir = path.join(runtimeRoot, 'explicit-config')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: { TTDASH_CONFIG_DIR: explicitConfigDir },
      })

      const uploadResponse = await fetchTrusted(`${standaloneServer.url}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleUsage),
      })
      expect(uploadResponse.status).toBe(200)

      const settingsResponse = await fetchTrusted(`${standaloneServer.url}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' }),
      })
      expect(settingsResponse.status).toBe(200)
      expect(standaloneServer.getOutput()).toContain('Settings File:')
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it('returns 500 for corrupt persisted usage data and recovers after deletion', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-corrupt-usage-test-'))
    const dataFile = path.join(getCliDataDir(runtimeRoot), 'data.json')
    mkdirSync(path.dirname(dataFile), { recursive: true })
    writeFileSync(dataFile, '{not-json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        readinessPath: '/api/runtime',
      })
      const corruptResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(corruptResponse.status).toBe(500)

      const deleteResponse = await fetchTrusted(`${standaloneServer.url}/api/usage`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('returns 500 for corrupt persisted settings and recovers after deletion', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-corrupt-settings-test-'))
    const settingsFile = path.join(getCliConfigDir(runtimeRoot), 'settings.json')
    mkdirSync(path.dirname(settingsFile), { recursive: true })
    writeFileSync(settingsFile, '{not-json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })
      const corruptResponse = await fetch(`${standaloneServer.url}/api/settings`)
      expect(corruptResponse.status).toBe(500)

      const deleteResponse = await fetchTrusted(`${standaloneServer.url}/api/settings`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('writes persisted data and settings with restrictive local permissions', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-permissions-test-'))
    const dataFile = path.join(getCliDataDir(runtimeRoot), 'data.json')
    const settingsFile = path.join(getCliConfigDir(runtimeRoot), 'settings.json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })
      expect(
        (
          await fetchTrusted(`${standaloneServer.url}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sampleUsage),
          })
        ).status,
      ).toBe(200)

      expect(
        (
          await fetchTrusted(`${standaloneServer.url}/api/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'en' }),
          })
        ).status,
      ).toBe(200)

      expect(permissionBits(path.dirname(dataFile))).toBe(0o700)
      expect(permissionBits(path.dirname(settingsFile))).toBe(0o700)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })
})
