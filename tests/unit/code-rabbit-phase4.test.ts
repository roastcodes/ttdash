import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildDashboardChartTransforms,
  filterByModels,
  getDateRange,
  toWeekdayData,
} from '@/lib/data-transforms'
import { coerceNumber, formatMonthYear } from '@/lib/formatters'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

describe('phase 4 correctness helpers', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('returns null instead of coercing malformed numeric values to zero', () => {
    expect(coerceNumber(undefined)).toBeNull()
    expect(coerceNumber(Number.NaN)).toBeNull()
    expect(coerceNumber(Number.POSITIVE_INFINITY)).toBeNull()
    expect(coerceNumber('not-a-number')).toBeNull()
    expect(coerceNumber('42.5')).toBe(42.5)
    expect(coerceNumber(7)).toBe(7)
  })

  it('rejects malformed month identifiers instead of defaulting them to January', () => {
    expect(formatMonthYear('2026')).toBe('')
    expect(formatMonthYear('2026-13')).toBe('')
    expect(formatMonthYear('2026-04')).toBe('April 2026')
  })

  it('deduplicates normalized modelsUsed entries after model filtering', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-01',
        inputTokens: 30,
        outputTokens: 10,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 40,
        totalCost: 3,
        requestCount: 2,
        modelsUsed: ['gpt-5-4', 'gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5-4',
            inputTokens: 20,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 2,
            requestCount: 1,
          },
          {
            modelName: 'gpt-5.4',
            inputTokens: 10,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 1,
            requestCount: 1,
          },
        ],
      },
    ]

    expect(filterByModels(data, ['GPT-5.4'])[0]?.modelsUsed).toEqual(['GPT-5.4'])
  })

  it('finds the date range from the first valid entry instead of assuming index zero is usable', () => {
    const validEntry: DailyUsage = {
      date: '2026-04-03',
      inputTokens: 1,
      outputTokens: 1,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 2,
      totalCost: 1,
      requestCount: 1,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
    }
    const laterEntry: DailyUsage = { ...validEntry, date: '2026-04-06' }

    expect(getDateRange([undefined, validEntry, laterEntry] as unknown as DailyUsage[])).toEqual({
      start: '2026-04-03',
      end: '2026-04-06',
    })
  })

  it('keeps weekday labels aligned with Monday-first buckets', () => {
    const weekdayData = toWeekdayData([
      {
        date: '2026-04-06',
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 15,
        totalCost: 9,
        requestCount: 1,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [],
      },
    ])

    expect(weekdayData[0]?.day).toBe('Mo')
    expect(weekdayData[0]?.cost).toBe(9)
  })

  it('rebuilds weekday labels for the active locale instead of reusing stale labels', async () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-06',
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 15,
        totalCost: 9,
        requestCount: 1,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [],
      },
    ]

    const english = buildDashboardChartTransforms(data, 'en-US')
    await initI18n('de')
    const german = buildDashboardChartTransforms(data, 'de-CH')

    expect(english.weekdayData[0]?.day).toBe('Mo')
    expect(german.weekdayData[2]?.day).toBe('Mi')
  })
})
