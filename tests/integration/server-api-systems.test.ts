import { describe, expect, it } from 'vitest'
import { fetchTrusted } from './server-test-helpers'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()

describe('local server multi-system API', () => {
  it('exports local data, imports and replaces another host, then aggregates both systems', async () => {
    const upload = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(upload.status).toBe(200)

    const exported = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/export`)
    expect(exported.status).toBe(200)
    const localEnvelope = await exported.json()
    expect(localEnvelope).toMatchObject({
      kind: 'ttdash-system-export',
      version: 1,
    })
    expect(localEnvelope.data.daily).toHaveLength(sampleUsage.daily.length)
    expect(localEnvelope.data.totals.totalCost).toBeCloseTo(sampleUsage.totals.totalCost)
    expect(exported.headers.get('content-disposition')).toContain(
      `ttdash-system-${localEnvelope.hostname}.json`,
    )
    expect(exported.headers.get('content-disposition')).not.toMatch(/\d{4}-\d{2}-\d{2}/)

    const externalEnvelope = { ...localEnvelope, hostname: 'workstation-b' }
    const preview = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/import/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(externalEnvelope),
    })
    expect(await preview.json()).toEqual({
      hostname: 'workstation-b',
      filename: 'ttdash-system-workstation-b.json',
      exists: false,
    })

    const imported = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(externalEnvelope),
    })
    expect(imported.status).toBe(200)

    const collision = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(externalEnvelope),
    })
    expect(collision.status).toBe(409)
    expect(await collision.json()).toMatchObject({ code: 'SYSTEM_EXISTS' })

    const replacementEnvelope = {
      ...externalEnvelope,
      data: {
        ...externalEnvelope.data,
        daily: externalEnvelope.data.daily.map((day: (typeof sampleUsage.daily)[number]) => ({
          ...day,
          totalCost: day.totalCost * 2,
          modelBreakdowns: day.modelBreakdowns.map((model) => ({
            ...model,
            cost: model.cost * 2,
          })),
        })),
      },
    }
    const replaced = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/import?replace=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replacementEnvelope),
    })
    expect(replaced.status).toBe(200)
    expect(await replaced.json()).toMatchObject({ hostname: 'workstation-b', replaced: true })

    const usage = await (await fetchTrusted(`${sharedServer.baseUrl}/api/usage`)).json()
    expect(usage.systems).toHaveLength(2)
    expect(usage.systems.map((system: { hostname: string }) => system.hostname)).toContain(
      'workstation-b',
    )
    expect(usage.daily).toHaveLength(sampleUsage.daily.length)
    expect(usage.totals.totalCost).toBeCloseTo(sampleUsage.totals.totalCost * 3)
  })

  it('removes imported-system files and persisted selections on delete and full reset', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    const localEnvelope = await (
      await fetchTrusted(`${sharedServer.baseUrl}/api/systems/export`)
    ).json()
    for (const hostname of ['workstation-b', 'workstation-c']) {
      const response = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localEnvelope, hostname }),
      })
      expect(response.status).toBe(200)
    }

    const settingsUpdate = await fetchTrusted(`${sharedServer.baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultFilters: {
          viewMode: 'daily',
          datePreset: 'all',
          systems: ['workstation-b', 'workstation-c'],
          providers: [],
          models: [],
        },
      }),
    })
    expect(settingsUpdate.status).toBe(200)

    const deleteOne = await fetchTrusted(`${sharedServer.baseUrl}/api/systems/workstation-b`, {
      method: 'DELETE',
    })
    expect(deleteOne.status).toBe(200)
    let settings = await (await fetchTrusted(`${sharedServer.baseUrl}/api/settings`)).json()
    expect(settings.defaultFilters.systems).toEqual(['workstation-c'])

    const reset = await fetchTrusted(`${sharedServer.baseUrl}/api/usage`, { method: 'DELETE' })
    expect(reset.status).toBe(200)
    const usage = await (await fetchTrusted(`${sharedServer.baseUrl}/api/usage`)).json()
    expect(usage.systems).toEqual([])
    settings = await (await fetchTrusted(`${sharedServer.baseUrl}/api/settings`)).json()
    expect(settings.defaultFilters.systems).toEqual([])
  })
})
