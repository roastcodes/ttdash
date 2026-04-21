// @vitest-environment jsdom

import { type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TokenEfficiency } from '@/components/charts/TokenEfficiency'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('@/components/charts/ChartCard', () => ({
  ChartCard: ({
    title,
    subtitle,
    children,
  }: {
    title: string
    subtitle?: string
    children: ReactNode | ((expanded: boolean) => ReactNode)
  }) => (
    <div>
      <div>{title}</div>
      {subtitle && <div>{subtitle}</div>}
      {typeof children === 'function' ? children(false) : children}
    </div>
  ),
  ChartAnimationAware: ({ children }: { children: (active: boolean) => ReactNode }) => (
    <>{children(false)}</>
  ),
  ChartReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer data-testid="token-efficiency-chart" data-chart={JSON.stringify(data ?? [])}>
      {children}
    </MockSvgContainer>
  ),
  Area: ({ name, stroke, fill }: { name?: string; stroke?: string; fill?: string }) => (
    <MockSvgGroup
      data-testid="token-efficiency-area"
      data-name={name ?? ''}
      data-stroke={stroke ?? ''}
      data-fill={fill ?? ''}
    />
  ),
  Line: ({ name, strokeDasharray }: { name?: string; strokeDasharray?: string }) => (
    <MockSvgGroup
      data-testid="token-efficiency-line"
      data-name={name ?? ''}
      data-dash={strokeDasharray ?? ''}
    />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
}))

describe('TokenEfficiency', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders the efficiency series with a shared gradient fill while keeping the moving average dashed', () => {
    const data: DailyUsage[] = [
      buildDay('2026-04-01', 2, 500_000),
      buildDay('2026-04-02', 3, 600_000),
      buildDay('2026-04-03', 4, 700_000),
    ]

    renderWithTooltip(<TokenEfficiency data={data} />)

    expect(screen.getByText('Token efficiency ($/1M)')).toBeInTheDocument()
    const area = screen.getByTestId('token-efficiency-area')
    expect(area).toHaveAttribute('data-name', '$/1M tokens')
    expect(area).toHaveAttribute('data-fill', expect.stringMatching(/^url\(#grad-/))

    const line = screen.getByTestId('token-efficiency-line')
    expect(line).toHaveAttribute('data-name', '7D avg')
    expect(line).toHaveAttribute('data-dash', '5 5')
  })
})

function buildDay(date: string, totalCost: number, totalTokens: number): DailyUsage {
  return {
    date,
    inputTokens: totalTokens / 2,
    outputTokens: totalTokens / 2,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens,
    totalCost,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: totalTokens / 2,
        outputTokens: totalTokens / 2,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        cost: totalCost,
        requestCount: 1,
      },
    ],
  }
}
