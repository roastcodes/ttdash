// @vitest-environment jsdom

import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderCostForecast } from '@/components/features/forecast/ProviderCostForecast'
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
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  Area: ({ dataKey, fill }: { dataKey?: string; fill?: string }) => (
    <MockSvgGroup data-testid="provider-area" data-key={dataKey} data-fill={fill ?? ''} />
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
      data-testid="provider-line"
      data-name={name ?? ''}
      data-stroke={stroke ?? ''}
      data-dash={strokeDasharray ?? ''}
    />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: ({
    content,
  }: {
    content?: ReactElement<{ seriesMeta?: Array<{ actualKey: string; forecastKey: string }> }>
  }) => {
    if (!content) return null
    const seriesMeta = content.props.seriesMeta ?? []

    return cloneElement(content, {
      active: true,
      label: '2026-04-04',
      payload: seriesMeta.flatMap((series, index) => [
        {
          dataKey: series.actualKey,
          value: 12 + index * 3,
        },
        {
          dataKey: series.forecastKey,
          value: 9 + index * 2,
        },
      ]),
    })
  },
  Legend: () => null,
}))

function buildDay(
  date: string,
  entries: Array<{
    modelName: string
    cost: number
    requestCount?: number
    inputTokens?: number
    outputTokens?: number
  }>,
): DailyUsage {
  return {
    date,
    inputTokens: entries.reduce((sum, entry) => sum + (entry.inputTokens ?? 100), 0),
    outputTokens: entries.reduce((sum, entry) => sum + (entry.outputTokens ?? 40), 0),
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: entries.reduce(
      (sum, entry) => sum + (entry.inputTokens ?? 100) + (entry.outputTokens ?? 40),
      0,
    ),
    totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
    requestCount: entries.reduce((sum, entry) => sum + (entry.requestCount ?? 1), 0),
    modelsUsed: entries.map((entry) => entry.modelName),
    modelBreakdowns: entries.map((entry) => ({
      modelName: entry.modelName,
      inputTokens: entry.inputTokens ?? 100,
      outputTokens: entry.outputTokens ?? 40,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      cost: entry.cost,
      requestCount: entry.requestCount ?? 1,
    })),
  }
}

describe('ProviderCostForecast', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders provider-specific actual and forecast series without a computed tooltip total', () => {
    const data: DailyUsage[] = [
      buildDay('2026-04-01', [
        { modelName: 'gpt-5.4', cost: 10 },
        { modelName: 'claude-sonnet-4', cost: 4 },
      ]),
      buildDay('2026-04-02', [
        { modelName: 'gpt-5.4', cost: 12 },
        { modelName: 'claude-sonnet-4', cost: 5 },
      ]),
      buildDay('2026-04-04', [
        { modelName: 'gpt-5.4', cost: 16 },
        { modelName: 'claude-sonnet-4', cost: 6 },
      ]),
    ]

    renderWithTooltip(
      <ProviderCostForecast forecast={computeCurrentMonthProviderForecasts(data)} />,
    )

    expect(screen.getByText('Current month forecast by provider')).toBeInTheDocument()
    const chips = screen.getAllByTestId('provider-forecast-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveAttribute('data-provider', 'OpenAI')
    expect(chips[1]).toHaveAttribute('data-provider', 'Anthropic')
    expect(screen.getAllByText('Actual cost:')).toHaveLength(2)
    expect(screen.getAllByText('Forecast:')).toHaveLength(2)
    expect(screen.getAllByText('Month-end forecast:')).toHaveLength(2)
    expect(screen.queryByText('Total:')).not.toBeInTheDocument()

    const lineEls = screen.getAllByTestId('provider-line')
    const openAiActual = lineEls.find((entry) => entry.getAttribute('data-name') === 'OpenAI')
    const openAiForecast = lineEls.find(
      (entry) => entry.getAttribute('data-name') === 'OpenAI Forecast',
    )
    const anthropicActual = lineEls.find((entry) => entry.getAttribute('data-name') === 'Anthropic')
    const anthropicForecast = lineEls.find(
      (entry) => entry.getAttribute('data-name') === 'Anthropic Forecast',
    )

    expect(openAiActual).toHaveAttribute('data-stroke', getProviderBadgeStyle('OpenAI').color)
    expect(openAiForecast).toHaveAttribute('data-stroke', getProviderBadgeStyle('OpenAI').color)
    expect(openAiForecast).toHaveAttribute('data-dash', '6 3')
    expect(anthropicActual).toHaveAttribute('data-stroke', getProviderBadgeStyle('Anthropic').color)
    expect(anthropicForecast).toHaveAttribute(
      'data-stroke',
      getProviderBadgeStyle('Anthropic').color,
    )
    expect(anthropicForecast).toHaveAttribute('data-dash', '6 3')
  }, 15_000)

  it('only renders visible providers from the filtered dataset', () => {
    const openAiOnlyData: DailyUsage[] = [
      buildDay('2026-04-01', [{ modelName: 'gpt-5.4', cost: 10 }]),
      buildDay('2026-04-02', [{ modelName: 'gpt-5.4', cost: 14 }]),
      buildDay('2026-04-04', [{ modelName: 'gpt-5.4', cost: 16 }]),
    ]

    renderWithTooltip(
      <ProviderCostForecast forecast={computeCurrentMonthProviderForecasts(openAiOnlyData)} />,
    )

    const chips = screen.getAllByTestId('provider-forecast-chip')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAttribute('data-provider', 'OpenAI')

    const lineEls = screen.getAllByTestId('provider-line')
    expect(lineEls).toHaveLength(2)
    expect(
      lineEls.every(
        (entry) => entry.getAttribute('data-stroke') === getProviderBadgeStyle('OpenAI').color,
      ),
    ).toBe(true)
  })

  it('shows the daily-only fallback outside daily view', () => {
    renderWithTooltip(<ProviderCostForecast forecast={null} viewMode="monthly" />)

    expect(
      screen.getByText('Provider forecast is available in daily view only'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('provider-line')).not.toBeInTheDocument()
  })
})
