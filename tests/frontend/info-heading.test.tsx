// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SectionHeader } from '@/components/ui/section-header'
import { RequestQuality } from '@/components/features/request-quality/RequestQuality'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'

const metrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  activeDays: 0,
  topModel: null,
  topRequestModel: null,
  topTokenModel: null,
  topModelShare: 0,
  topThreeModelsShare: 0,
  topProvider: null,
  providerCount: 0,
  hasRequestData: false,
  cacheHitRate: 0,
  costPerMillion: 0,
  avgTokensPerRequest: 0,
  avgCostPerRequest: 0,
  avgModelsPerEntry: 0,
  avgDailyCost: 0,
  avgRequestsPerDay: 0,
  topDay: null,
  cheapestDay: null,
  busiestWeek: null,
  weekendCostShare: null,
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreate: 0,
  totalThinking: 0,
  totalRequests: 0,
  weekOverWeekChange: null,
  requestVolatility: 0,
  modelConcentrationIndex: 0,
  providerConcentrationIndex: 0,
}

describe('Info heading semantics', () => {
  beforeEach(async () => {
    globalThis.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof IntersectionObserver
    await initI18n('en')
  })

  it('keeps the shared section heading name free of the info button label', () => {
    render(
      <TooltipProvider delayDuration={0}>
        <SectionHeader title="Correlations" info="Helpful context" />
      </TooltipProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Correlations' })).toBeInTheDocument()
    const infoButton = screen.getByRole('button', { name: 'Show info' })
    expect(infoButton).toBeInTheDocument()
    expect(infoButton).toHaveClass('focus-visible:ring-2')
  })

  it('keeps feature card titles semantically separate from the info button', () => {
    render(
      <TooltipProvider delayDuration={0}>
        <RequestQuality metrics={metrics} viewMode="daily" />
      </TooltipProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Request quality' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show info' })).toBeInTheDocument()
  })
})
