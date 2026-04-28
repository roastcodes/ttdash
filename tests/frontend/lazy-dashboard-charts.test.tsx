// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CostByWeekday } from '@/components/charts/CostByWeekday'
import { ModelMix } from '@/components/charts/ModelMix'
import { TokensOverTime } from '@/components/charts/TokensOverTime'
import { PeriodComparison } from '@/components/features/comparison/PeriodComparison'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage, TokenChartDataPoint, WeekdayData } from '@/types'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('@/components/charts/ChartCard', () => ({
  ChartCard: ({
    children,
    expandedExtra,
    subtitle,
    summary,
    title,
  }: {
    children: ReactNode | ((expanded: boolean) => ReactNode)
    expandedExtra?: ReactNode
    subtitle?: string
    summary?: ReactNode
    title: string
  }) => (
    <div>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
      {summary ? <div data-testid="chart-summary">{summary}</div> : null}
      <div data-testid="chart-main">
        {typeof children === 'function' ? children(false) : children}
      </div>
      {expandedExtra ? <div data-testid="chart-expanded">{expandedExtra}</div> : null}
    </div>
  ),
  ChartAnimationAware: ({ children }: { children: (active: boolean) => ReactNode }) => (
    <>{children(false)}</>
  ),
  ChartReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/model-color-context', () => ({
  useModelColorHelpers: () => ({
    getModelColor: (model: string) =>
      model.includes('Claude') ? 'rgb(251 146 60)' : 'rgb(16 185 129)',
  }),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  AreaChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer data-chart={JSON.stringify(data ?? [])} data-testid="area-chart">
      {children}
    </MockSvgContainer>
  ),
  BarChart: ({
    children,
    data,
    onMouseLeave,
    onMouseMove,
  }: {
    children: ReactNode
    data?: unknown
    onMouseLeave?: () => void
    onMouseMove?: (state: { activeTooltipIndex: number }) => void
  }) => (
    <MockSvgContainer
      data-chart={JSON.stringify(data ?? [])}
      data-testid="bar-chart"
      onMouseLeave={() => onMouseLeave?.()}
      onMouseMove={() => onMouseMove?.({ activeTooltipIndex: 1 })}
    >
      {children}
    </MockSvgContainer>
  ),
  ComposedChart: ({
    children,
    data,
    onClick,
  }: {
    children: ReactNode
    data?: unknown
    onClick?: (state: { activePayload?: Array<{ payload?: { date?: string } }> }) => void
  }) => {
    const chartData = Array.isArray(data) ? data : []
    const firstPoint = chartData[0] as { date?: string } | undefined
    return (
      <MockSvgContainer
        data-chart={JSON.stringify(chartData)}
        data-testid="composed-chart"
        onClick={() => onClick?.({ activePayload: [{ payload: firstPoint }] })}
      >
        {children}
      </MockSvgContainer>
    )
  },
  Area: ({ dataKey, fill, name }: { dataKey?: string; fill?: string; name?: string }) => (
    <MockSvgGroup
      data-fill={fill ?? ''}
      data-key={dataKey ?? ''}
      data-name={name ?? ''}
      data-testid="chart-area"
    />
  ),
  Bar: ({ children, dataKey, name }: { children?: ReactNode; dataKey?: string; name?: string }) => (
    <MockSvgGroup data-key={dataKey ?? ''} data-name={name ?? ''} data-testid="chart-bar">
      {children}
    </MockSvgGroup>
  ),
  CartesianGrid: () => null,
  Cell: ({ fill }: { fill?: string }) => (
    <MockSvgGroup data-fill={fill ?? ''} data-testid="bar-cell" />
  ),
  Line: ({
    dataKey,
    name,
    strokeDasharray,
  }: {
    dataKey?: string
    name?: string
    strokeDasharray?: string
  }) => (
    <MockSvgGroup
      data-dash={strokeDasharray ?? ''}
      data-key={dataKey ?? ''}
      data-name={name ?? ''}
      data-testid="chart-line"
    />
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

function createDailyUsage(
  date: string,
  {
    claudeCost,
    gptCost,
  }: {
    claudeCost: number
    gptCost: number
  },
): DailyUsage {
  const totalCost = claudeCost + gptCost
  return {
    date,
    inputTokens: 100,
    outputTokens: 50,
    cacheCreationTokens: 10,
    cacheReadTokens: 40,
    thinkingTokens: 5,
    totalTokens: 205,
    totalCost,
    requestCount: 4,
    modelsUsed: ['Claude Sonnet 4.5', 'GPT-5.4'],
    modelBreakdowns: [
      {
        modelName: 'Claude Sonnet 4.5',
        inputTokens: 50,
        outputTokens: 25,
        cacheCreationTokens: 5,
        cacheReadTokens: 20,
        thinkingTokens: 2,
        cost: claudeCost,
        requestCount: 2,
      },
      {
        modelName: 'GPT-5.4',
        inputTokens: 50,
        outputTokens: 25,
        cacheCreationTokens: 5,
        cacheReadTokens: 20,
        thinkingTokens: 3,
        cost: gptCost,
        requestCount: 2,
      },
    ],
  }
}

const weekdayData: WeekdayData[] = [
  { day: 'Mo', cost: 3 },
  { day: 'Di', cost: 9 },
  { day: 'Mi', cost: 6 },
  { day: 'Do', cost: 4 },
  { day: 'Fr', cost: 7 },
  { day: 'Sa', cost: 2 },
  { day: 'So', cost: 5 },
]

const tokenData: TokenChartDataPoint[] = [
  {
    date: '2026-04-01',
    Input: 100,
    Output: 50,
    'Cache Write': 20,
    'Cache Read': 60,
    Thinking: 10,
    totalTokens: 240,
    tokenMA7: 240,
    inputMA7: 100,
    outputMA7: 50,
    cacheWriteMA7: 20,
    cacheReadMA7: 60,
    thinkingMA7: 10,
  },
  {
    date: '2026-04-02',
    Input: 120,
    Output: 70,
    'Cache Write': 30,
    'Cache Read': 80,
    Thinking: 20,
    totalTokens: 320,
    tokenMA7: 280,
    inputMA7: 110,
    outputMA7: 60,
    cacheWriteMA7: 25,
    cacheReadMA7: 70,
    thinkingMA7: 15,
  },
]

describe('lazy dashboard charts', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders CostByWeekday peak and low bars without a browser-only chart dependency', () => {
    renderWithTooltip(<CostByWeekday data={weekdayData} />)

    expect(screen.getByText('Cost by weekday')).toBeInTheDocument()
    expect(screen.getByText('Peak: Di · Low: Sa · Weekend 19%')).toBeInTheDocument()
    expect(screen.getByTestId('chart-bar')).toHaveAttribute('data-name', 'Avg cost')

    const fills = screen.getAllByTestId('bar-cell').map((cell) => cell.getAttribute('data-fill'))
    expect(fills).toHaveLength(7)
    expect(fills.some((fill) => fill?.includes('weekdayPeak'))).toBe(true)
    expect(fills.some((fill) => fill?.includes('weekdayLow'))).toBe(true)
  })

  it('renders ModelMix for enough model history and skips underspecified input', () => {
    const modelMixData = [
      createDailyUsage('2026-04-01', { claudeCost: 3, gptCost: 7 }),
      createDailyUsage('2026-04-02', { claudeCost: 5, gptCost: 5 }),
      createDailyUsage('2026-04-03', { claudeCost: 8, gptCost: 2 }),
    ]
    const view = renderWithTooltip(<ModelMix data={modelMixData.slice(0, 2)} />)

    expect(view.container).toBeEmptyDOMElement()
    view.unmount()

    renderWithTooltip(<ModelMix data={modelMixData} />)

    expect(screen.getByText('Model mix')).toBeInTheDocument()
    expect(screen.getByText('Cost share by model over time')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-area')).toHaveLength(2)
  })

  it('renders token totals, moving averages, and drilldown clicks in TokensOverTime', () => {
    const onClickDay = vi.fn()

    renderWithTooltip(<TokensOverTime data={tokenData} onClickDay={onClickDay} />)

    expect(screen.getByText('Tokens over time')).toBeInTheDocument()
    expect(screen.getByText('Cache tokens')).toBeInTheDocument()
    expect(screen.getByText('Input / Output tokens')).toBeInTheDocument()
    expect(screen.getByText('Thinking tokens')).toBeInTheDocument()
    expect(screen.getByText('Total tokens (all types)')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-area')).toHaveLength(6)
    expect(screen.getAllByTestId('chart-line')).toHaveLength(6)

    fireEvent.click(screen.getAllByTestId('composed-chart')[0])

    expect(onClickDay).toHaveBeenCalledWith('2026-04-01')
  })

  it('renders PeriodComparison empty and populated states with preset switching', () => {
    const comparisonData = Array.from({ length: 14 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      return createDailyUsage(`2026-04-${day}`, {
        claudeCost: index + 1,
        gptCost: index + 2,
      })
    })
    const view = renderWithTooltip(<PeriodComparison data={comparisonData.slice(0, 3)} />)

    expect(screen.getByText('Not enough data for a comparison')).toBeInTheDocument()
    expect(screen.getByText('At least 7 days required (currently: 3)')).toBeInTheDocument()
    view.unmount()

    renderWithTooltip(<PeriodComparison data={comparisonData} />)

    expect(screen.getByText('Period comparison')).toBeInTheDocument()
    expect(screen.getByText('Last week')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Month' }))

    expect(screen.getByText('Last month')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
  })
})
