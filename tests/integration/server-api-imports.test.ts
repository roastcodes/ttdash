import { describe, expect, it } from 'vitest'
import { getDefaultDashboardSectionOrder } from '../../shared/app-settings.js'
import { fetchTrusted } from './server-test-helpers'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()

describe('local server API imports', () => {
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
    expect(await settingsImportResponse.json()).toMatchObject({
      language: 'de',
      theme: 'light',
      reducedMotionPreference: 'never',
      providerLimits: {
        Anthropic: {
          hasSubscription: true,
          subscriptionPrice: 21.5,
          monthlyLimit: 300.11,
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
        insights: true,
      },
      sectionOrder: [
        'tables',
        'metrics',
        'insights',
        ...getDefaultDashboardSectionOrder().filter(
          (sectionId) => !['tables', 'metrics', 'insights'].includes(sectionId),
        ),
      ],
      lastLoadedAt: '2026-04-01T12:30:00.000Z',
      lastLoadSource: 'file',
      cliAutoLoadActive: false,
    })

    const equivalentImportedDay = {
      ...sampleUsage.daily[0],
      modelsUsed: sampleUsage.daily[0].modelsUsed.map((modelName) => ` ${modelName} `),
      modelBreakdowns: sampleUsage.daily[0].modelBreakdowns.map((entry) => ({
        ...entry,
        modelName: ` ${entry.modelName} `,
      })),
    }
    const newImportedDay = { ...sampleUsage.daily[0], date: '2026-03-31' }
    const usageImportResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-usage-backup',
        version: 1,
        data: {
          daily: [
            equivalentImportedDay,
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
      skippedDays: 0,
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
})
