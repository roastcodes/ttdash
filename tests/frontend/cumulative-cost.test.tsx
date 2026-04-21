// @vitest-environment jsdom

import { type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CumulativeCost } from '@/components/charts/CumulativeCost'
import { computeCurrentMonthForecast } from '@/lib/calculations'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { MockSvgContainer } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer data-testid="cumulative-chart" data-chart={JSON.stringify(data ?? [])}>
      {children}
    </MockSvgContainer>
  ),
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

describe('CumulativeCost', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('adds the remaining current-month forecast on top of the visible cumulative slice', () => {
    const forecastSource: DailyUsage[] = [
      buildDay('2026-04-01', 6),
      buildDay('2026-04-05', 12),
      buildDay('2026-04-06', 18),
      buildDay('2026-04-07', 14),
    ]

    const visibleChartData = [
      { date: '2026-04-05', cost: 12, cumulative: 12 },
      { date: '2026-04-06', cost: 18, cumulative: 30 },
      { date: '2026-04-07', cost: 14, cumulative: 44 },
    ]

    const forecast = computeCurrentMonthForecast(forecastSource)
    expect(forecast).not.toBeNull()

    renderWithTooltip(<CumulativeCost data={visibleChartData} forecast={forecast} />)

    const chart = screen.getByTestId('cumulative-chart')
    const points = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<{
      date: string
      projected?: number
      cumulative?: number
    }>
    const expectedProjection =
      visibleChartData[2]!.cumulative! + ((forecast?.forecastTotal ?? 0) - 44)

    expect(points).toHaveLength(5)
    expect(points[3]).toMatchObject({ date: '2026-04-07', cumulative: 44, projected: 44 })
    expect(points[4]).toMatchObject({
      date: '2026-04-30',
      projected: expectedProjection,
    })
    expect(points[4]?.projected).toBe(forecast?.forecastTotal)
  })

  it('preserves prior visible months and only replaces the current month with the month forecast', () => {
    const forecastSource: DailyUsage[] = [
      buildDay('2026-04-01', 6),
      buildDay('2026-04-05', 12),
      buildDay('2026-04-06', 18),
      buildDay('2026-04-07', 14),
    ]

    const visibleChartData = [
      { date: '2026-03-30', cost: 20, cumulative: 20 },
      { date: '2026-03-31', cost: 30, cumulative: 50 },
      { date: '2026-04-05', cost: 12, cumulative: 62 },
      { date: '2026-04-06', cost: 18, cumulative: 80 },
      { date: '2026-04-07', cost: 14, cumulative: 94 },
    ]

    const forecast = computeCurrentMonthForecast(forecastSource)
    expect(forecast).not.toBeNull()

    renderWithTooltip(<CumulativeCost data={visibleChartData} forecast={forecast} />)

    const chart = screen.getByTestId('cumulative-chart')
    const points = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<{
      date: string
      projected?: number
      cumulative?: number
    }>
    const expectedProjection = 94 + ((forecast?.forecastTotal ?? 0) - 44)

    expect(points.at(-2)).toMatchObject({ date: '2026-04-07', cumulative: 94, projected: 94 })
    expect(points.at(-1)).toMatchObject({
      date: '2026-04-30',
      projected: expectedProjection,
    })
    expect(points.at(-1)?.projected).toBeGreaterThan(forecast?.forecastTotal ?? 0)
  })

  it('does not project when the visible cumulative series does not end in the forecast month', () => {
    const forecastSource: DailyUsage[] = [
      buildDay('2026-04-01', 6),
      buildDay('2026-04-05', 12),
      buildDay('2026-04-06', 18),
      buildDay('2026-04-07', 14),
    ]

    const visibleChartData = [
      { date: '2026-03-01', cost: 10, cumulative: 10 },
      { date: '2026-03-02', cost: 15, cumulative: 25 },
      { date: '2026-03-03', cost: 20, cumulative: 45 },
    ]

    const forecast = computeCurrentMonthForecast(forecastSource)
    expect(forecast).not.toBeNull()

    renderWithTooltip(<CumulativeCost data={visibleChartData} forecast={forecast} />)

    const chart = screen.getByTestId('cumulative-chart')
    const points = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<{
      date: string
      projected?: number
      cumulative?: number
    }>

    expect(points).toEqual(visibleChartData)
  })
})

function buildDay(date: string, totalCost: number): DailyUsage {
  return {
    date,
    inputTokens: 100,
    outputTokens: 40,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 140,
    totalCost,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: 100,
        outputTokens: 40,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        cost: totalCost,
        requestCount: 1,
      },
    ],
  }
}
