import { describe, expect, it } from 'vitest'
import { computeDashboardForecastState } from '@/lib/calculations'
import { getCurrentMonthForecastData } from '@/lib/data-transforms'
import { createDailyUsage } from '../factories'

describe('forecast clock and coverage', () => {
  it('does not label a historical month as the current month', () => {
    const historical = [createDailyUsage(), createDailyUsage({ date: '2026-04-02' })]
    expect(computeDashboardForecastState(historical, '2026-09-30')).toEqual({
      costForecast: null,
      providerForecast: null,
    })
    expect(getCurrentMonthForecastData(historical, [], [], '2026-09-30')).toEqual([])
  })

  it('excludes the partial current day from fitting while retaining actual spend', () => {
    const data = [1, 2, 3].map((day) =>
      createDailyUsage({ date: `2026-04-0${day}`, totalCost: day === 3 ? 1000 : 10 }),
    )
    const forecast = computeDashboardForecastState(data, '2026-04-03').costForecast!
    expect(forecast.currentMonthTotal).toBe(1020)
    expect(forecast.projectedDailyBurn).toBe(10)
    expect(forecast.partialToday).toBe(true)
    expect(forecast.forecastTotal).toBe(1290)
  })

  it('caps confidence for unknown gaps and keeps total and provider projections additive', () => {
    const data = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((day, index) =>
      createDailyUsage({
        date: `2026-04-${String(day).padStart(2, '0')}`,
        modelName: index % 2 ? 'gpt-5.4' : 'claude-sonnet-4-6',
        totalCost: index % 2 ? 10 : 25,
      }),
    )
    const result = computeDashboardForecastState(data, '2026-04-16')
    expect(result.costForecast?.confidence).toBe('low')
    expect(result.costForecast?.missingDays).toBe(1)
    expect(result.costForecast?.forecastTotal).toBeCloseTo(
      result.providerForecast!.providers.reduce((sum, provider) => sum + provider.forecastTotal, 0),
      10,
    )
    expect(
      result.providerForecast?.providers.every((provider) => provider.confidence === 'low'),
    ).toBe(true)
  })

  it('retains unassigned recorded costs so stacked provider totals reconcile', () => {
    const data = [1, 2].map((day) => ({
      ...createDailyUsage({ date: `2026-04-0${day}`, totalCost: 5 }),
      totalCost: 10,
    }))
    const result = computeDashboardForecastState(data, '2026-04-03')
    expect(result.providerForecast?.providers.map((provider) => provider.provider)).toContain(
      'Unassigned',
    )
    expect(result.costForecast?.currentMonthTotal).toBe(result.providerForecast?.currentMonthTotal)
    expect(result.costForecast?.forecastTotal).toBe(result.providerForecast?.forecastTotal)
  })

  it('does not invent a provider for floating-point rounding dust', () => {
    const data = [1, 2].map((day) => ({
      ...createDailyUsage({ date: `2026-04-0${day}`, totalCost: 0.3 }),
      totalCost: 0.30000000000000004,
    }))
    const result = computeDashboardForecastState(data, '2026-04-03')
    expect(result.providerForecast?.providers.map((provider) => provider.provider)).toEqual([
      'OpenAI',
    ])
    expect(result.costForecast?.currentMonthTotal).toBeCloseTo(
      result.providerForecast!.currentMonthTotal,
      10,
    )
  })
})
