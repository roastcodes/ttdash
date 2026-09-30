import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'
import { fetchTrusted, getCliDataDir } from './server-test-helpers'
import { createDailyUsage } from '../factories'

const server = createApiSharedServer()

describe('atomic usage validation through the API', () => {
  it('rejects invalid replacement and backup imports without changing usage or load state', async () => {
    const upload = (payload: unknown, endpoint = '/api/upload') =>
      fetchTrusted(`${server.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    expect((await upload(sampleUsage)).status).toBe(200)
    const before = await (await fetchTrusted(`${server.baseUrl}/api/usage`)).json()
    const settings = await (await fetchTrusted(`${server.baseUrl}/api/settings`)).json()
    for (const endpoint of ['/api/upload', '/api/usage/import']) {
      const response = await upload(
        { daily: [...sampleUsage.daily, { ...sampleUsage.daily[0], date: '2026-02-30' }] },
        endpoint,
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        issues: [{ date: '2026-02-30', field: 'date', code: 'invalid_date' }],
      })
      expect(await (await fetchTrusted(`${server.baseUrl}/api/usage`)).json()).toEqual(before)
      expect(await (await fetchTrusted(`${server.baseUrl}/api/settings`)).json()).toEqual(settings)
    }
  })

  it('diagnoses malformed legacy rows on read and keeps the persisted bytes intact', async () => {
    const file = path.join(getCliDataDir(server.tempRoot), 'data.json')
    const source = JSON.stringify({
      daily: [sampleUsage.daily[0], { ...sampleUsage.daily[1], date: '2026-02-30' }],
    })
    await writeFile(file, source)
    const response = await fetchTrusted(`${server.baseUrl}/api/usage`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      daily: [{ date: sampleUsage.daily[0]!.date }],
      qualityIssues: [expect.objectContaining({ code: 'invalid_date' })],
    })
    expect(await readFile(file, 'utf8')).toBe(source)

    const settings = await (await fetchTrusted(`${server.baseUrl}/api/settings`)).json()
    const imported = await fetchTrusted(`${server.baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(imported.status).toBe(409)
    expect(await imported.json()).toMatchObject({
      issues: [expect.objectContaining({ code: 'invalid_date' })],
    })
    expect(await readFile(file, 'utf8')).toBe(source)
    expect(await (await fetchTrusted(`${server.baseUrl}/api/settings`)).json()).toEqual(settings)
  })

  it('recognizes an unchanged backup with reordered known and unknown model counters', async () => {
    const breakdown = createDailyUsage({ totalCost: 2, requestCount: 2 }).modelBreakdowns[0]!
    const day = {
      ...createDailyUsage({
        modelBreakdowns: [
          { ...breakdown, requestCountStatus: 'known' },
          { ...breakdown, cost: 8, requestCount: 0, requestCountStatus: 'unknown' },
        ],
      }),
      requestCountStatus: 'partial',
    }
    const upload = await fetchTrusted(`${server.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily: [day] }),
    })
    expect(upload.status).toBe(200)
    const imported = await fetchTrusted(`${server.baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily: [{ ...day, modelBreakdowns: [...day.modelBreakdowns].reverse() }],
      }),
    })
    expect(imported.status).toBe(200)
    expect(await imported.json()).toMatchObject({ unchangedDays: 1, conflictingDays: 0 })
  })
})
