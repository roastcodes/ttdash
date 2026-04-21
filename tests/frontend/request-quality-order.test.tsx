// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestQuality } from '@/components/features/request-quality/RequestQuality'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'

vi.mock('@/components/ui/animated-bar-fill', () => ({
  AnimatedBarFill: ({ order }: { order?: number }) => (
    <div data-testid="quality-bar-fill" data-order={String(order ?? '')} />
  ),
}))

const metrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  totalInput: 0,
  totalOutput: 0,
  totalCacheCreate: 0,
  totalCacheRead: 0,
  totalThinking: 0,
  totalRequests: 4,
  activeDays: 2,
  avgDailyCost: 0,
  avgTokensPerRequest: 100_000,
  avgCostPerRequest: 0.125,
  peakDay: null,
  cacheHitRate: 0,
  modelCount: 0,
  providerCount: 0,
  topModels: [],
  topRequestModel: null,
  dailyBurnRate: 0,
  requestVolatility: 0,
  providerConcentrationIndex: 0,
  topProvider: null,
  hasRequestData: true,
}

describe('RequestQuality bar ordering', () => {
  beforeEach(async () => {
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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes deterministic bar order values to AnimatedBarFill', () => {
    render(
      <TooltipProvider>
        <RequestQuality metrics={metrics} viewMode="daily" />
      </TooltipProvider>,
    )

    expect(
      screen.getAllByTestId('quality-bar-fill').map((fill) => fill.getAttribute('data-order')),
    ).toEqual(['0', '1', '2', '3'])
  })
})
