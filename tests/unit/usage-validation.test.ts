import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createDailyUsage } from '../factories'

const { normalizeIncomingData } = createRequire(import.meta.url)('../../usage-normalizer.js')

describe('usage validation and provenance', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-01-00', '2026-1-01'])(
    'rejects impossible calendar date %s',
    (date) => {
      expect(() => normalizeIncomingData({ daily: [createDailyUsage({ date })] })).toThrow(
        'invalid_date',
      )
    },
  )

  it.each([
    -1,
    Infinity,
    NaN,
    true,
    'abc',
    '0x10',
    '0b10',
    '0o10',
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid token values %s atomically', (inputTokens) => {
    expect(() =>
      normalizeIncomingData({
        daily: [createDailyUsage(), { ...createDailyUsage({ date: '2026-04-02' }), inputTokens }],
      }),
    ).toThrow('invalid_number')
  })

  it('rejects inconsistent totals and conflicting dates, but deduplicates identical days', () => {
    const day = createDailyUsage({ totalCost: 2 })
    expect(normalizeIncomingData({ daily: [day, day] }).daily).toHaveLength(1)
    expect(() => normalizeIncomingData({ daily: [day, { ...day, totalCost: 3 }] })).toThrow(
      'conflicting_duplicate',
    )
    expect(() => normalizeIncomingData({ daily: [{ ...day, totalCost: 1 }] })).toThrow(
      'breakdown_exceeds_total',
    )
    expect(() => normalizeIncomingData({ daily: [{ ...day, totalTokens: 999 }] })).toThrow(
      'inconsistent_total',
    )
  })

  it('preserves legitimate unallocated daily amounts through normalization and reimport', () => {
    const day = createDailyUsage({ totalCost: 2 })
    const normalized = normalizeIncomingData({
      daily: [
        {
          ...day,
          totalCost: 3,
          inputTokens: day.inputTokens + 20,
          totalTokens: day.totalTokens + 20,
        },
      ],
    })
    expect(normalized.daily[0].modelBreakdowns).toContainEqual(
      expect.objectContaining({ modelName: '__ttdash_unassigned__', cost: 1, inputTokens: 20 }),
    )
    expect(normalizeIncomingData(normalized)).toEqual(normalized)
  })

  it('distinguishes a missing counter from a reported zero and combines mixed coverage', () => {
    const day = createDailyUsage()
    const withoutCounter = { ...day.modelBreakdowns[0]! } as Partial<
      (typeof day.modelBreakdowns)[0]
    >
    delete withoutCounter.requestCount
    const unknown = normalizeIncomingData({
      daily: [{ date: day.date, modelBreakdowns: [withoutCounter] }],
    })
    const known = normalizeIncomingData({
      daily: [{ date: day.date, modelBreakdowns: [{ ...withoutCounter, requestCount: 0 }] }],
    })
    const partial = normalizeIncomingData({
      daily: [
        {
          date: day.date,
          modelBreakdowns: [
            withoutCounter,
            { ...withoutCounter, modelName: 'claude-sonnet-4-6', requestCount: 2 },
          ],
        },
      ],
    })
    expect(unknown.daily[0].requestCountStatus).toBe('unknown')
    expect(known.daily[0].requestCountStatus).toBe('known')
    expect(partial.daily[0].requestCountStatus).toBe('partial')
  })

  it('keeps ambiguous counters in old normalized files unknown, but preserves new measured zeros', () => {
    const legacy = { daily: [createDailyUsage({ requestCount: 0 })] }
    expect(normalizeIncomingData(legacy, { persisted: true }).daily[0].requestCountStatus).toBe(
      'unknown',
    )
    const fresh = normalizeIncomingData(legacy)
    expect(fresh.daily[0].requestCountStatus).toBe('known')
    expect(normalizeIncomingData(fresh, { persisted: true }).daily[0].requestCountStatus).toBe(
      'known',
    )
  })

  it('keeps valid legacy days and returns bounded diagnostics without mutating the source', () => {
    const payload = {
      daily: [createDailyUsage(), ...Array.from({ length: 70 }, () => ({ date: '2026-02-30' }))],
    }
    const snapshot = JSON.stringify(payload)
    const result = normalizeIncomingData(payload, { persisted: true })
    expect(result.daily).toHaveLength(1)
    expect(result.qualityIssues).toHaveLength(50)
    expect(JSON.stringify(payload)).toBe(snapshot)
  })

  it('carries sanitized legacy diagnostics only when reading persisted data', () => {
    const payload = {
      daily: [createDailyUsage()],
      qualityIssues: [{ date: '2026-02-30', field: 'date', code: 'invalid_date' }],
    }
    expect(normalizeIncomingData(payload, { persisted: true }).qualityIssues).toEqual(
      payload.qualityIssues,
    )
    expect(normalizeIncomingData(payload).qualityIssues).toBeUndefined()
  })

  it('treats whitespace-only counters as missing and supports decimal and exponent strings', () => {
    const missing = normalizeIncomingData({
      daily: [{ date: '2026-04-01', totalCost: 1, requestCount: ' \t ' }],
    })
    expect(missing.daily[0].requestCountStatus).toBe('unknown')
    const measured = normalizeIncomingData({
      daily: [
        { date: '2026-04-01', totalCost: ' +.5 ', inputTokens: ' 1e3 ', requestCount: ' 1 ' },
      ],
    })
    expect(measured.daily[0]).toMatchObject({
      totalCost: 0.5,
      inputTokens: 1000,
      requestCount: 1,
      requestCountStatus: 'known',
    })
  })
})
