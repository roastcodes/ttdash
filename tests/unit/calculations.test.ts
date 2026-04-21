import { describe, expect, it } from 'vitest'
import {
  computeDashboardForecastState,
  computeCurrentMonthForecast,
  computeCurrentMonthProviderForecasts,
} from '@/lib/calculations'
import type { DailyUsage } from '@/types'

function createDailyUsage(date: string, totalCost: number): DailyUsage {
  return {
    date,
    inputTokens: 100,
    outputTokens: 50,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 150,
    totalCost,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        cost: totalCost,
        requestCount: 1,
      },
    ],
  }
}

describe('computeCurrentMonthForecast', () => {
  it('returns null when the current month has fewer than two days of data', () => {
    const forecast = computeCurrentMonthForecast([
      createDailyUsage('2026-03-31', 4),
      createDailyUsage('2026-04-01', 7),
    ])

    expect(forecast).toBeNull()
  })

  it('fills missing elapsed calendar days with zero-cost gaps', () => {
    const forecast = computeCurrentMonthForecast([
      createDailyUsage('2026-04-01', 10),
      createDailyUsage('2026-04-03', 20),
    ])

    expect(forecast).not.toBeNull()
    expect(forecast?.elapsedCalendarSeries).toEqual([
      { date: '2026-04-01', cost: 10 },
      { date: '2026-04-02', cost: 0 },
      { date: '2026-04-03', cost: 20 },
    ])
    expect(forecast?.currentMonthTotal).toBe(30)
    expect(forecast?.projectedDailyBurn).toBeCloseTo(10, 6)
    expect(forecast?.forecastTotal).toBeCloseTo(300, 6)
  })

  it('dampens a large outlier instead of projecting the raw month-to-date average', () => {
    const forecast = computeCurrentMonthForecast([
      createDailyUsage('2026-04-01', 10),
      createDailyUsage('2026-04-02', 10),
      createDailyUsage('2026-04-03', 10),
      createDailyUsage('2026-04-04', 10),
      createDailyUsage('2026-04-05', 10),
      createDailyUsage('2026-04-06', 10),
      createDailyUsage('2026-04-07', 1000),
    ])

    expect(forecast).not.toBeNull()
    expect(forecast?.projectedDailyBurn).toBeLessThan(130)
    expect(forecast?.projectedDailyBurn).toBeLessThan((1060 / 7) * 0.9)
    expect(forecast?.projectedDailyBurn).toBeGreaterThan(50)
  })

  it('uses stable confidence thresholds for 7-day and 14-day histories', () => {
    const mediumConfidence = computeCurrentMonthForecast(
      Array.from({ length: 7 }, (_, index) =>
        createDailyUsage(`2026-04-${String(index + 1).padStart(2, '0')}`, 5),
      ),
    )
    const highConfidence = computeCurrentMonthForecast(
      Array.from({ length: 14 }, (_, index) =>
        createDailyUsage(`2026-04-${String(index + 1).padStart(2, '0')}`, 5),
      ),
    )

    expect(mediumConfidence).not.toBeNull()
    expect(mediumConfidence?.confidence).toBe('medium')
    expect(mediumConfidence?.lowerDaily).toBe(5)
    expect(mediumConfidence?.upperDaily).toBe(5)

    expect(highConfidence).not.toBeNull()
    expect(highConfidence?.confidence).toBe('high')
    expect(highConfidence?.forecastTotal).toBe(150)
  })
})

describe('computeCurrentMonthProviderForecasts', () => {
  it('builds separate provider forecasts on the shared month-to-date calendar', () => {
    const forecast = computeCurrentMonthProviderForecasts([
      {
        ...createDailyUsage('2026-04-01', 10),
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 10,
            requestCount: 1,
          },
        ],
        modelsUsed: ['gpt-5.4'],
      },
      {
        ...createDailyUsage('2026-04-02', 20),
        modelBreakdowns: [
          {
            modelName: 'claude-sonnet-4-5',
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 20,
            requestCount: 1,
          },
        ],
        modelsUsed: ['claude-sonnet-4-5'],
      },
      {
        ...createDailyUsage('2026-04-04', 30),
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 30,
            requestCount: 1,
          },
        ],
        modelsUsed: ['gpt-5.4'],
      },
    ])

    expect(forecast).not.toBeNull()
    expect(forecast?.elapsedDays).toBe(4)
    expect(forecast?.providers.map((entry) => entry.provider)).toEqual(['OpenAI', 'Anthropic'])

    const openAi = forecast?.providers.find((entry) => entry.provider === 'OpenAI')
    const anthropic = forecast?.providers.find((entry) => entry.provider === 'Anthropic')

    expect(openAi?.elapsedCalendarSeries).toEqual([
      { date: '2026-04-01', cost: 10 },
      { date: '2026-04-02', cost: 0 },
      { date: '2026-04-03', cost: 0 },
      { date: '2026-04-04', cost: 30 },
    ])
    expect(anthropic?.elapsedCalendarSeries).toEqual([
      { date: '2026-04-01', cost: 0 },
      { date: '2026-04-02', cost: 20 },
      { date: '2026-04-03', cost: 0 },
      { date: '2026-04-04', cost: 0 },
    ])
    expect(forecast?.currentMonthTotal).toBe(60)
    expect(forecast?.forecastTotal).toBeCloseTo(
      (openAi?.forecastTotal ?? 0) + (anthropic?.forecastTotal ?? 0),
      6,
    )
  })

  it('returns null when no provider has enough current-month data to forecast', () => {
    const forecast = computeCurrentMonthProviderForecasts([createDailyUsage('2026-04-01', 7)])

    expect(forecast).toBeNull()
  })
})

describe('computeDashboardForecastState', () => {
  it('derives total and provider forecasts from one shared month-to-date input', () => {
    const data = [
      createDailyUsage('2026-04-01', 10),
      {
        ...createDailyUsage('2026-04-02', 20),
        modelBreakdowns: [
          {
            modelName: 'claude-sonnet-4-5',
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 20,
            requestCount: 1,
          },
        ],
        modelsUsed: ['claude-sonnet-4-5'],
      },
      createDailyUsage('2026-04-04', 30),
    ]

    const forecastState = computeDashboardForecastState(data)

    expect(forecastState.costForecast?.currentMonthTotal).toBe(60)
    expect(forecastState.providerForecast?.currentMonthTotal).toBe(60)
    expect(forecastState.providerForecast?.providers.map((entry) => entry.provider)).toEqual([
      'OpenAI',
      'Anthropic',
    ])
  })
})
