import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { legacyPayload, toktrackPayload } from '../fixtures/usage-data'

const require = createRequire(import.meta.url)
const { normalizeIncomingData } = require('../../usage-normalizer.js')

describe('normalizeIncomingData', () => {
  it('normalizes toktrack payloads, sorts by date, and computes totals', () => {
    const normalized = normalizeIncomingData(toktrackPayload)

    expect(normalized.daily.map((entry: { date: string }) => entry.date)).toEqual([
      '2026-03-31',
      '2026-04-01',
    ])
    expect(normalized.daily[1]).toMatchObject({
      totalTokens: 62,
      totalCost: 1.25,
      requestCount: 3,
      modelsUsed: ['gpt-5.4', 'claude-sonnet-4-5'],
    })
    expect(normalized.totals).toEqual({
      inputTokens: 70,
      outputTokens: 22,
      cacheCreationTokens: 15,
      cacheReadTokens: 35,
      thinkingTokens: 5,
      totalCost: 2.75,
      totalTokens: 147,
      requestCount: 7,
    })
  })

  it('normalizes legacy payloads and derives missing totals from breakdowns', () => {
    const normalized = normalizeIncomingData(legacyPayload)

    expect(normalized.daily).toHaveLength(1)
    expect(normalized.daily[0]).toMatchObject({
      date: '2026-04-02',
      totalTokens: 18,
      totalCost: 0.75,
      requestCount: 2,
      modelsUsed: ['gemini-2.5-pro'],
    })
    expect(normalized.totals.totalTokens).toBe(18)
  })

  it('rejects payloads without a valid usage shape', () => {
    expect(() => normalizeIncomingData({ invalid: true })).toThrow(
      'Die JSON-Datei muss ein gültiges tägliches Nutzungsformat enthalten.',
    )
  })
})
