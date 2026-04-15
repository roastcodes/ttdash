// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestCacheHitRateByModel } from '@/components/charts/RequestCacheHitRateByModel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  BarChart: ({
    children,
    barSize,
    maxBarSize,
  }: {
    children: ReactNode
    barSize?: number
    maxBarSize?: number
  }) => (
    <div
      data-testid="snapshot-bar-chart"
      data-bar-size={String(barSize)}
      data-max-bar-size={String(maxBarSize)}
    >
      {children}
    </div>
  ),
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`snapshot-bar-${dataKey}`} />,
  Cell: () => null,
}))

class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

function buildDay(overrides: Partial<DailyUsage>): DailyUsage {
  return {
    date: '2026-04-01',
    inputTokens: 100,
    outputTokens: 40,
    cacheCreationTokens: 10,
    cacheReadTokens: 20,
    thinkingTokens: 5,
    totalTokens: 175,
    totalCost: 12,
    requestCount: 4,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: 100,
        outputTokens: 40,
        cacheCreationTokens: 10,
        cacheReadTokens: 20,
        thinkingTokens: 5,
        cost: 12,
        requestCount: 4,
      },
    ],
    ...overrides,
  }
}

describe('RequestCacheHitRateByModel', () => {
  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await initI18n('en')
  })

  it('uses a thicker explicit bar size for the current model snapshot', () => {
    render(
      <TooltipProvider>
        <RequestCacheHitRateByModel
          timelineData={[
            buildDay({ date: '2026-04-01' }),
            buildDay({ date: '2026-04-02', cacheReadTokens: 35, totalTokens: 190 }),
          ]}
          summaryData={[
            buildDay({ date: '2026-04-01' }),
            buildDay({ date: '2026-04-02', cacheReadTokens: 35, totalTokens: 190 }),
          ]}
          viewMode="daily"
        />
      </TooltipProvider>,
    )

    expect(screen.getByTestId('snapshot-bar-chart')).toHaveAttribute('data-bar-size', '6')
    expect(screen.getByTestId('snapshot-bar-chart')).toHaveAttribute('data-max-bar-size', '6')
    expect(screen.getByTestId('snapshot-bar-totalRate')).toBeInTheDocument()
    expect(screen.getByTestId('snapshot-bar-trailing7Rate')).toBeInTheDocument()
  })

  it('uses the trend label consistently outside daily mode', () => {
    render(
      <TooltipProvider>
        <RequestCacheHitRateByModel
          timelineData={[
            buildDay({ date: '2026-03-01' }),
            buildDay({ date: '2026-04-01', cacheReadTokens: 35, totalTokens: 190 }),
          ]}
          summaryData={[
            buildDay({ date: '2026-03-01' }),
            buildDay({ date: '2026-04-01', cacheReadTokens: 35, totalTokens: 190 }),
          ]}
          viewMode="monthly"
        />
      </TooltipProvider>,
    )

    expect(screen.getAllByText('Trend avg').length).toBeGreaterThan(0)
    expect(screen.queryByText('7-day avg')).not.toBeInTheDocument()
  })
})
