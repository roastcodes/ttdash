// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestQuality } from '@/components/features/request-quality/RequestQuality'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'

const baseMetrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  totalInput: 0,
  totalOutput: 0,
  totalCacheCreate: 0,
  totalCacheRead: 0,
  totalThinking: 0,
  totalRequests: 0,
  activeDays: 0,
  avgDailyCost: 0,
  avgTokensPerRequest: 0,
  avgCostPerRequest: 0,
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
  hasRequestData: false,
}

describe('RequestQuality', () => {
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

  it('keeps request-quality progress bars empty when request data is unavailable', () => {
    const { container } = render(
      <TooltipProvider>
        <RequestQuality metrics={baseMetrics} viewMode="daily" />
      </TooltipProvider>,
    )

    const progressBars = container.querySelectorAll('[style*="width: 0%"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(4)
    expect(screen.getAllByText('n/a').length).toBeGreaterThanOrEqual(4)
  })

  it('keeps real zero-value metrics at 0% width even when request data exists', () => {
    const { container } = render(
      <TooltipProvider>
        <RequestQuality
          metrics={{
            ...baseMetrics,
            hasRequestData: true,
            totalRequests: 4,
            activeDays: 2,
          }}
          viewMode="daily"
        />
      </TooltipProvider>,
    )

    const progressBars = container.querySelectorAll('[style*="width: 0%"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText('n/a')).not.toBeInTheDocument()
  })
})
