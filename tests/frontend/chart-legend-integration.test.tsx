// @vitest-environment jsdom

import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CostByModel } from '@/components/charts/CostByModel'
import { RequestsOverTime } from '@/components/charts/RequestsOverTime'
import { TokenTypes } from '@/components/charts/TokenTypes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'

let lastLegendPayload: Array<{ value: string; color: string }> = []

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer data-testid="responsive-container">{children}</MockSvgContainer>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  Pie: ({ children, data = [] }: { children: ReactNode; data?: Array<{ name: string }> }) => {
    lastLegendPayload = data.map((entry, index) => ({
      value: entry.name,
      color: `hsl(${(index + 1) * 40} 70% 50%)`,
    }))
    return <MockSvgGroup>{children}</MockSvgGroup>
  },
  Legend: ({ content }: { content?: ReactElement }) =>
    content ? (
      <MockSvgContainer>{cloneElement(content, { payload: lastLegendPayload })}</MockSvgContainer>
    ) : null,
  Tooltip: () => null,
  Cell: () => null,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
}))

describe('Chart legend integrations', () => {
  beforeEach(async () => {
    lastLegendPayload = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    await initI18n('en')
  })

  it('wraps CostByModel legend labels instead of relying on horizontal scroll', () => {
    const { container } = render(
      <TooltipProvider>
        <CostByModel
          data={[
            { name: 'GPT-5.4', value: 60 },
            { name: 'Claude Sonnet 4.5', value: 25 },
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText(/GPT-5\.4 \(\$60(?:\.0+)?\)/)).toBeInTheDocument()
    expect(screen.getByText(/Claude Sonnet 4\.5 \(\$25(?:\.0+)?\)/)).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })

  it('wraps TokenTypes legend labels instead of relying on horizontal scroll', () => {
    const { container } = render(
      <TooltipProvider>
        <TokenTypes
          data={[
            { name: 'Cache Write', value: 1200 },
            { name: 'Cache Read', value: 950 },
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('Cache Write (1.2k)')).toBeInTheDocument()
    expect(screen.getByText('Cache Read (950)')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })

  it('wraps RequestsOverTime donut legend labels instead of relying on horizontal scroll', () => {
    const { container } = render(
      <TooltipProvider>
        <RequestsOverTime
          data={[
            {
              date: '2026-04-01',
              totalRequests: 120,
              totalRequestsMA7: 110,
              'GPT-5.4': 80,
              'Claude Sonnet 4.5': 40,
            },
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('GPT-5.4 (80)')).toBeInTheDocument()
    expect(screen.getByText('Claude Sonnet 4.5 (40)')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })
})
