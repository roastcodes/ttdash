import { describe, expect, it } from 'vitest'
import { computeMetrics, computeMovingAverage, computeWeekOverWeekChange } from '@/lib/calculations'
import { aggregateToDailyFormat } from '@/lib/data-transforms'
import { buildPeriodComparison } from '@/lib/period-comparison-data'
import { mergeSystemUsageByDate } from '@/lib/dashboard-filter-data'
import { createDailyUsage } from '../factories'

describe('dashboard calendar and denominator correctness', () => {
  it('keeps daily and monthly denominators separate, excluding inactive rows from active days', () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      createDailyUsage({ date: `2026-04-${String(index + 1).padStart(2, '0')}`, totalCost: 10 }),
    )
    const metrics = computeMetrics(aggregateToDailyFormat(rows, 'monthly'))
    expect(metrics).toMatchObject({
      totalCost: 300,
      activeDays: 30,
      calendarDays: 30,
      avgDailyCost: 10,
      avgCostPerPeriod: 300,
      avgRequestsPerPeriod: 30,
    })
    const inactive = {
      ...createDailyUsage({ date: '2026-04-02' }),
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      modelBreakdowns: [],
      modelsUsed: [],
    }
    expect(computeMetrics([rows[0]!, inactive])).toMatchObject({
      activeDays: 1,
      calendarDays: 2,
      avgDailyCost: 10,
      avgCalendarDailyCost: 5,
    })
  })

  it('compares seven calendar days even when rows are sparse and unsorted', () => {
    const rows = ['2026-04-15', '2026-04-01', '2026-04-08'].map((date, index) =>
      createDailyUsage({ date, totalCost: index === 0 ? 20 : 10 }),
    )
    expect(computeWeekOverWeekChange(rows)).toBe(100)
    expect(computeMovingAverage([70, 7], 7, ['2026-04-01', '2026-04-15'])[1]).toBeUndefined()
    expect(computeMovingAverage([7, undefined], 7, ['2026-04-01', '2026-04-08'])[1]).toBeUndefined()
  })

  it('matches weekdays, month lengths, leap years, and year boundaries without DST shifts', () => {
    expect(buildPeriodComparison([], 'week', '2026-03-31')).toMatchObject({
      startA: '2026-03-30',
      endA: '2026-03-31',
      startB: '2026-03-23',
      endB: '2026-03-24',
      days: 2,
    })
    expect(buildPeriodComparison([], 'month', '2026-03-31')).toMatchObject({
      endA: '2026-03-28',
      endB: '2026-02-28',
      days: 28,
    })
    expect(buildPeriodComparison([], 'month', '2024-03-31')).toMatchObject({
      endA: '2024-03-29',
      endB: '2024-02-29',
      days: 29,
    })
    expect(buildPeriodComparison([], 'month', '2026-01-03')).toMatchObject({
      startB: '2025-12-01',
      endB: '2025-12-03',
      days: 3,
    })
  })

  it('limits per-request ratios to known counter coverage and separates cache denominators', () => {
    const known = createDailyUsage({
      totalCost: 2,
      inputTokens: 100,
      outputTokens: 100,
      cacheReadTokens: 100,
      requestCount: 2,
    })
    const unknown = {
      ...createDailyUsage({ date: '2026-04-02', totalCost: 98, requestCount: 0 }),
      requestCountStatus: 'unknown' as const,
      modelBreakdowns: [],
    }
    const metrics = computeMetrics([known, unknown])
    expect(metrics.avgCostPerRequest).toBe(1)
    expect(metrics.avgRequestsPerDay).toBe(2)
    expect(metrics.avgRequestsPerPeriod).toBe(2)
    expect(metrics.avgTokensPerRequest).toBe(150)
    expect(metrics.requestCoverage).toBeLessThan(100)
    expect(computeMetrics([known]).cacheHitRate).toBeCloseTo(100 / 3)
    expect(computeMetrics([known]).inputCacheHitRate).toBe(50)
  })

  it('preserves partial provenance when combining source systems on the same date', () => {
    const known = createDailyUsage({ totalCost: 2, requestCount: 2 })
    const unknown = {
      ...createDailyUsage({ totalCost: 98, requestCount: 0 }),
      requestCountStatus: 'unknown' as const,
      modelBreakdowns: [
        {
          ...known.modelBreakdowns[0]!,
          cost: 98,
          requestCount: 0,
          requestCountStatus: 'unknown' as const,
        },
      ],
    }
    const systems = [known, unknown].map((day, index) => ({
      id: String(index),
      hostname: String(index),
      isLocal: index === 0,
      exportedAt: null,
      filename: '',
      data: { daily: [day], totals: {} as never },
    }))
    const result = mergeSystemUsageByDate(systems)
    expect(result[0]?.requestCountStatus).toBe('partial')
    // Merging same-model counters must not attribute unknown cost to the known requests.
    expect(computeMetrics(result).knownRequestCost).toBe(2)
    expect(computeMetrics(result).avgCostPerRequest).toBe(1)
  })
})
