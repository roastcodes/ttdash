import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
} from '@/lib/dashboard-preferences'
import { fetchTrusted, startStandaloneServer, stopProcess } from './server-test-helpers'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()
const emptyUsageResponse = {
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
}
const defaultSettingsResponse = {
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
}

describe('local server API persistence', () => {
  it('starts with empty usage and default settings', async () => {
    const initialUsageResponse = await fetch(`${sharedServer.baseUrl}/api/usage`)
    expect(initialUsageResponse.status).toBe(200)
    expect(await initialUsageResponse.json()).toEqual(emptyUsageResponse)

    const initialSettingsResponse = await fetch(`${sharedServer.baseUrl}/api/settings`)
    expect(initialSettingsResponse.status).toBe(200)
    expect(await initialSettingsResponse.json()).toMatchObject(defaultSettingsResponse)
  })

  it('upload persists usage data', async () => {
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
  })

  it('upload updates settings last-load metadata', async () => {
    const uploadResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(uploadResponse.status).toBe(200)

    const afterUploadSettingsResponse = await fetch(`${sharedServer.baseUrl}/api/settings`)
    const afterUploadSettings = await afterUploadSettingsResponse.json()
    expect(afterUploadSettingsResponse.status).toBe(200)
    expect(afterUploadSettings.lastLoadSource).toBe('file')
    expect(afterUploadSettings.lastLoadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('settings patch normalizes persisted values', async () => {
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
  })

  it('delete clears usage data', async () => {
    const uploadResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(uploadResponse.status).toBe(200)

    const deleteResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ success: true })

    const finalUsageResponse = await fetch(`${sharedServer.baseUrl}/api/usage`)
    const finalUsage = await finalUsageResponse.json()
    expect(finalUsage).toEqual(emptyUsageResponse)
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
})
