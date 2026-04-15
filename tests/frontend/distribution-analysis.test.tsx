// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DistributionAnalysis } from '@/components/charts/DistributionAnalysis'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="distribution-bar-chart">{children}</div>
  ),
  Bar: ({
    children,
    dataKey,
    isAnimationActive,
  }: {
    children?: ReactNode
    dataKey: string
    isAnimationActive?: boolean
  }) => (
    <div
      data-testid={`distribution-bar-${dataKey}`}
      data-animate={String(Boolean(isAnimationActive))}
    >
      {children}
    </div>
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}))

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          target: document.createElement('div'),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }
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
    modelBreakdowns: [],
    ...overrides,
  }
}

describe('DistributionAnalysis', () => {
  beforeEach(async () => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await initI18n('en')
  })

  it('keeps histogram bars inactive until the chart card becomes visible', () => {
    render(
      <TooltipProvider>
        <DistributionAnalysis
          data={[
            buildDay({ date: '2026-04-01', totalCost: 5, requestCount: 2, totalTokens: 100 }),
            buildDay({ date: '2026-04-02', totalCost: 12, requestCount: 4, totalTokens: 200 }),
            buildDay({ date: '2026-04-03', totalCost: 18, requestCount: 6, totalTokens: 260 }),
            buildDay({ date: '2026-04-04', totalCost: 30, requestCount: 8, totalTokens: 320 }),
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getAllByTestId('distribution-bar-count')).not.toHaveLength(0)
    expect(
      screen
        .getAllByTestId('distribution-bar-count')
        .every((bar) => bar.dataset.animate === 'false'),
    ).toBe(true)

    act(() => {
      MockIntersectionObserver.instances.forEach((observer) => observer.trigger(true))
    })

    expect(
      screen
        .getAllByTestId('distribution-bar-count')
        .every((bar) => bar.dataset.animate === 'true'),
    ).toBe(true)
  })
})
