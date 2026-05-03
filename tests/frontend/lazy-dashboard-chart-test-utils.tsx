import type { ReactNode } from 'react'
import { vi } from 'vitest'
import type { DailyUsage, TokenChartDataPoint, WeekdayData } from '@/types'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'

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

export function createDailyUsage(
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

// Intentionally unsorted to verify chart components normalize weekday order.
export const weekdayData: WeekdayData[] = [
  { day: 'Mo', cost: 3, weekdayIndex: 0 },
  { day: 'Sa', cost: 2, weekdayIndex: 5 },
  { day: 'Tu', cost: 9, weekdayIndex: 1 },
  { day: 'Su', cost: 5, weekdayIndex: 6 },
  { day: 'We', cost: 6, weekdayIndex: 2 },
  { day: 'Th', cost: 4, weekdayIndex: 3 },
  { day: 'Fr', cost: 7, weekdayIndex: 4 },
]

// Legacy shape without weekdayIndex to verify defensive fallback in CostByWeekday.
export const legacyWeekdayData: WeekdayData[] = [
  { day: 'Lun', cost: 3 },
  { day: 'Sáb.', cost: 2 },
  { day: 'Mar', cost: 9 },
  { day: 'Dom.', cost: 5 },
  { day: 'Mié', cost: 6 },
  { day: 'Jue', cost: 4 },
  { day: 'Vie', cost: 7 },
]

export const tokenData: TokenChartDataPoint[] = [
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
