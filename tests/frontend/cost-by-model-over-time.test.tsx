// @vitest-environment jsdom

import { type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CostByModelOverTime } from '@/components/charts/CostByModelOverTime'
import { initI18n } from '@/lib/i18n'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('@/components/charts/ChartCard', () => ({
  ChartCard: ({
    title,
    subtitle,
    children,
    expandedExtra,
  }: {
    title: string
    subtitle?: string
    children: ReactNode | ((expanded: boolean) => ReactNode)
    expandedExtra?: ReactNode
  }) => (
    <div>
      <div>{title}</div>
      {subtitle && <div>{subtitle}</div>}
      <div data-testid="cost-by-model-main">
        {typeof children === 'function' ? children(false) : children}
      </div>
      {expandedExtra ? <div data-testid="cost-by-model-expanded">{expandedExtra}</div> : null}
    </div>
  ),
  ChartAnimationAware: ({ children }: { children: (active: boolean) => ReactNode }) => (
    <>{children(false)}</>
  ),
  ChartReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/model-color-context', () => ({
  useModelColorHelpers: () => ({
    getModelColor: (name: string) =>
      name === 'gpt-4.1' ? 'rgb(10 132 255)' : name === 'gpt 4 1' ? 'rgb(255 99 132)' : '#999',
  }),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer data-testid="cost-by-model-chart" data-chart={JSON.stringify(data ?? [])}>
      {children}
    </MockSvgContainer>
  ),
  LineChart: ({ children, data }: { children: ReactNode; data?: unknown }) => (
    <MockSvgContainer data-testid="cost-by-model-ma-chart" data-chart={JSON.stringify(data ?? [])}>
      {children}
    </MockSvgContainer>
  ),
  Area: ({ name, stroke, fill }: { name?: string; stroke?: string; fill?: string }) => (
    <MockSvgGroup
      data-testid="cost-by-model-area"
      data-name={name ?? ''}
      data-stroke={stroke ?? ''}
      data-fill={fill ?? ''}
    />
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
      data-testid="cost-by-model-line"
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

describe('CostByModelOverTime', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders gradient-filled primary series while keeping moving averages dashed', () => {
    renderWithTooltip(
      <CostByModelOverTime
        models={['gpt-4.1', 'gpt 4 1']}
        data={[
          {
            date: '2026-04-01',
            cost: 5,
            'gpt-4.1': 5,
            'gpt 4 1': Number.NaN,
            'gpt-4.1_ma7': 4,
            'gpt 4 1_ma7': 2,
          },
          {
            date: '2026-04-02',
            cost: 4,
            'gpt-4.1': 4,
            'gpt 4 1': Number.POSITIVE_INFINITY,
            'gpt-4.1_ma7': 4.5,
            'gpt 4 1_ma7': 2.5,
          },
        ]}
      />,
    )

    expect(screen.getByText(/gpt-4\.1/i)).toBeInTheDocument()
    expect(screen.getByText(/\$9\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/infinity/i)).not.toBeInTheDocument()

    const mainAreas = screen.getAllByTestId('cost-by-model-area')
    expect(mainAreas).toHaveLength(2)
    const gradientFills = new Set(mainAreas.map((area) => area.getAttribute('data-fill')))
    for (const area of mainAreas) {
      expect(area).toHaveAttribute('data-fill', expect.stringMatching(/^url\(#grad-/))
    }
    expect(gradientFills.size).toBe(2)

    const maLines = screen.getAllByTestId('cost-by-model-line')
    expect(maLines).toHaveLength(2)
    for (const line of maLines) {
      expect(line).toHaveAttribute('data-dash', '5 4')
    }
  })
})
