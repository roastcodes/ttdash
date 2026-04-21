// @vitest-environment jsdom

import { type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CumulativeCostPerProvider } from '@/components/charts/CumulativeCostPerProvider'
import { computeCurrentMonthProviderForecasts } from '@/lib/calculations'
import { initI18n } from '@/lib/i18n'
import { getProviderBadgeStyle } from '@/lib/model-utils'
import type { DailyUsage } from '@/types'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  LineChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer
      data-testid="provider-cumulative-chart"
      data-chart={JSON.stringify(data ?? [])}
    >
      {children}
    </MockSvgContainer>
  ),
  Line: ({
    name,
    stroke,
    strokeDasharray,
  }: {
    name?: string
    stroke?: string
    strokeDasharray?: string
  }) => (
    <MockSvgGroup
      data-testid="provider-cumulative-line"
      data-name={name ?? ''}
      data-stroke={stroke ?? ''}
      data-dash={strokeDasharray ?? ''}
    />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

describe('CumulativeCostPerProvider', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders cumulative provider lines with provider colors and forecast projections', () => {
    const forecastSource: DailyUsage[] = [
      buildDay('2026-04-01', [
        { modelName: 'gpt-5.4', cost: 6 },
        { modelName: 'claude-sonnet-4', cost: 4 },
      ]),
      buildDay('2026-04-05', [
        { modelName: 'gpt-5.4', cost: 12 },
        { modelName: 'claude-sonnet-4', cost: 5 },
      ]),
      buildDay('2026-04-06', [
        { modelName: 'gpt-5.4', cost: 18 },
        { modelName: 'claude-sonnet-4', cost: 6 },
      ]),
      buildDay('2026-04-07', [
        { modelName: 'gpt-5.4', cost: 14 },
        { modelName: 'claude-sonnet-4', cost: 7 },
      ]),
    ]

    const visibleData: DailyUsage[] = [
      buildDay('2026-03-31', [
        { modelName: 'gpt-5.4', cost: 30 },
        { modelName: 'claude-sonnet-4', cost: 20 },
      ]),
      buildDay('2026-04-05', [
        { modelName: 'gpt-5.4', cost: 12 },
        { modelName: 'claude-sonnet-4', cost: 5 },
      ]),
      buildDay('2026-04-06', [
        { modelName: 'gpt-5.4', cost: 18 },
        { modelName: 'claude-sonnet-4', cost: 6 },
      ]),
      buildDay('2026-04-07', [
        { modelName: 'gpt-5.4', cost: 14 },
        { modelName: 'claude-sonnet-4', cost: 7 },
      ]),
    ]

    const forecast = computeCurrentMonthProviderForecasts(forecastSource)
    expect(forecast).not.toBeNull()

    renderWithTooltip(<CumulativeCostPerProvider data={visibleData} forecast={forecast} />)

    expect(screen.getByText('Cumulative cost per provider')).toBeInTheDocument()
    expect(screen.getByText(/Top driver: OpenAI/)).toBeInTheDocument()

    const lineEls = screen.getAllByTestId('provider-cumulative-line')
    const openAiActual = lineEls.find((entry) => entry.getAttribute('data-name') === 'OpenAI')
    const openAiProjection = lineEls.find(
      (entry) => entry.getAttribute('data-name') === 'OpenAI Projection',
    )
    const anthropicActual = lineEls.find((entry) => entry.getAttribute('data-name') === 'Anthropic')
    const anthropicProjection = lineEls.find(
      (entry) => entry.getAttribute('data-name') === 'Anthropic Projection',
    )

    expect(openAiActual).toHaveAttribute('data-stroke', getProviderBadgeStyle('OpenAI').color)
    expect(anthropicActual).toHaveAttribute('data-stroke', getProviderBadgeStyle('Anthropic').color)
    expect(openAiProjection).toHaveAttribute('data-dash', '5 5')
    expect(anthropicProjection).toHaveAttribute('data-dash', '5 5')

    const chart = screen.getByTestId('provider-cumulative-chart')
    const points = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<
      Record<string, number | string | undefined>
    >
    const openAiForecast = forecast?.providers.find((entry) => entry.provider === 'OpenAI')
    const anthropicForecast = forecast?.providers.find((entry) => entry.provider === 'Anthropic')

    expect(points.at(-2)).toMatchObject({
      date: '2026-04-07',
      openaiProjected: 74,
      anthropicProjected: 38,
    })
    expect(points.at(-1)).toMatchObject({
      date: '2026-04-30',
      openaiProjected: 74 + ((openAiForecast?.forecastTotal ?? 0) - 44),
      anthropicProjected: 38 + ((anthropicForecast?.forecastTotal ?? 0) - 18),
    })
  })

  it('renders actual cumulative provider lines without projection outside daily forecast scope', () => {
    const visibleData: DailyUsage[] = [
      buildDay('2026-03', [
        { modelName: 'gpt-5.4', cost: 30 },
        { modelName: 'claude-sonnet-4', cost: 20 },
      ]),
      buildDay('2026-04', [
        { modelName: 'gpt-5.4', cost: 44 },
        { modelName: 'claude-sonnet-4', cost: 22 },
      ]),
    ]

    renderWithTooltip(<CumulativeCostPerProvider data={visibleData} forecast={null} />)

    const chart = screen.getByTestId('provider-cumulative-chart')
    const points = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<
      Record<string, number | string | undefined>
    >

    expect(points).toEqual([
      { date: '2026-03', openaiCumulative: 30, anthropicCumulative: 20 },
      { date: '2026-04', openaiCumulative: 74, anthropicCumulative: 42 },
    ])
    expect(screen.queryByText(/Projection/)).not.toBeInTheDocument()
  })
})

function buildDay(
  date: string,
  entries: Array<{
    modelName: string
    cost: number
  }>,
): DailyUsage {
  return {
    date,
    inputTokens: entries.length * 100,
    outputTokens: entries.length * 40,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: entries.length * 140,
    totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
    requestCount: entries.length,
    modelsUsed: entries.map((entry) => entry.modelName),
    modelBreakdowns: entries.map((entry) => ({
      modelName: entry.modelName,
      inputTokens: 100,
      outputTokens: 40,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      cost: entry.cost,
      requestCount: 1,
    })),
  }
}
