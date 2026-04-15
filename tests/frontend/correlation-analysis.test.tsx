// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CorrelationAnalysis } from '@/components/charts/CorrelationAnalysis'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

vi.mock('@/lib/motion', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useShouldReduceMotion: () => true,
  }
})

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ScatterChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Scatter: ({
    data,
    isAnimationActive,
  }: {
    data?: Array<unknown>
    isAnimationActive?: boolean
  }) => (
    <div
      data-testid="scatter-series"
      data-points={String(data?.length ?? 0)}
      data-animate={String(Boolean(isAnimationActive))}
    />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ZAxis: () => null,
}))

class MockIntersectionObserver {
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

describe('CorrelationAnalysis', () => {
  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await initI18n('en')
  })

  it('renders scatter points statically when reduced motion is enabled', () => {
    render(
      <TooltipProvider>
        <CorrelationAnalysis
          data={[
            buildDay({ date: '2026-04-01' }),
            buildDay({ date: '2026-04-02', totalCost: 20, requestCount: 6, cacheReadTokens: 35 }),
          ]}
        />
      </TooltipProvider>,
    )

    const series = screen.getAllByTestId('scatter-series')
    expect(series[0]).toHaveAttribute('data-points', '2')
    expect(series[1]).toHaveAttribute('data-points', '2')
    expect(series[0]).toHaveAttribute('data-animate', 'false')
    expect(series[1]).toHaveAttribute('data-animate', 'false')
  })
})
