import { describe, expect, it } from 'vitest'
import { computeMetrics, computeMovingAverage, computeProviderMetrics } from '@/lib/calculations'
import { aggregateToDailyFormat, filterByProviders } from '@/lib/data-transforms'
import { dashboardFixture } from '../fixtures/usage-data'

describe('dashboard analytics', () => {
  it('recalculates totals when provider filtering removes model breakdowns', () => {
    const filtered = filterByProviders(dashboardFixture, ['OpenAI'])

    expect(filtered.map(entry => entry.date)).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-06',
    ])
    expect(filtered[0]).toMatchObject({
      totalCost: 6,
      totalTokens: 210,
      requestCount: 3,
      modelsUsed: ['gpt-5.4'],
    })
  })

  it('aggregates daily data into monthly periods with day counts preserved', () => {
    const monthly = aggregateToDailyFormat(dashboardFixture, 'monthly')

    expect(monthly).toHaveLength(2)
    expect(monthly[0]).toMatchObject({
      date: '2026-03',
      totalCost: 16,
      totalTokens: 550,
      requestCount: 9,
      _aggregatedDays: 2,
    })
    expect(monthly[1]).toMatchObject({
      date: '2026-04',
      totalCost: 14,
      totalTokens: 450,
      requestCount: 8,
      _aggregatedDays: 2,
    })
  })

  it('computes stable dashboard metrics from representative usage data', () => {
    const metrics = computeMetrics(dashboardFixture)

    expect(metrics.totalCost).toBe(30)
    expect(metrics.totalTokens).toBe(1000)
    expect(metrics.totalRequests).toBe(17)
    expect(metrics.topModel).toEqual({ name: 'GPT-5.4', cost: 17 })
    expect(metrics.topProvider?.name).toBe('OpenAI')
    expect(metrics.topProvider?.cost).toBe(17)
    expect(metrics.topProvider?.share).toBeCloseTo(56.6667, 3)
    expect(metrics.avgDailyCost).toBe(7.5)
    expect(metrics.avgModelsPerEntry).toBeCloseTo(1.75, 3)
    expect(metrics.avgRequestsPerDay).toBeCloseTo(4.25, 3)
    expect(metrics.weekendCostShare).toBeCloseTo(16.6667, 3)
    expect(metrics.cacheHitRate).toBeCloseTo(8, 3)
  })

  it('disables week-over-week comparisons for aggregated monthly views while keeping per-entry model averages stable', () => {
    const monthly = aggregateToDailyFormat(dashboardFixture, 'monthly')
    const metrics = computeMetrics(monthly)

    expect(metrics.avgModelsPerEntry).toBeCloseTo(2.5, 3)
    expect(metrics.weekOverWeekChange).toBeNull()
  })

  it('counts provider activity days once per date even when multiple provider models are present', () => {
    const providerMetrics = computeProviderMetrics([
      {
        date: '2026-04-01',
        inputTokens: 170,
        outputTokens: 90,
        cacheCreationTokens: 20,
        cacheReadTokens: 10,
        thinkingTokens: 0,
        totalTokens: 290,
        totalCost: 11,
        requestCount: 5,
        modelsUsed: ['gpt-5.4', 'gpt-5'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 20,
            cacheReadTokens: 5,
            thinkingTokens: 0,
            cost: 7,
            requestCount: 3,
          },
          {
            modelName: 'gpt-5',
            inputTokens: 70,
            outputTokens: 40,
            cacheCreationTokens: 0,
            cacheReadTokens: 5,
            thinkingTokens: 0,
            cost: 4,
            requestCount: 2,
          },
        ],
      },
      {
        date: '2026-04-02',
        inputTokens: 90,
        outputTokens: 40,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 130,
        totalCost: 5,
        requestCount: 2,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 90,
            outputTokens: 40,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 5,
            requestCount: 2,
          },
        ],
      },
    ])

    expect(providerMetrics.get('OpenAI')).toMatchObject({
      cost: 16,
      requests: 7,
      days: 2,
    })
  })

  it('computes moving averages with leading gaps instead of partial windows', () => {
    expect(computeMovingAverage([1, 2, 3, 4], 3)).toEqual([
      undefined,
      undefined,
      2,
      3,
    ])
  })
})
