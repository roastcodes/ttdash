// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SecondaryMetrics } from '@/components/cards/SecondaryMetrics'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'

vi.mock('@/components/features/help/InfoButton', () => ({
  InfoButton: ({ text }: { text: string }) => <span data-testid="metric-info">{text}</span>,
}))

const metrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  activeDays: 0,
  topModel: null,
  topRequestModel: null,
  topTokenModel: null,
  topModelShare: 0,
  topThreeModelsShare: 0,
  topProvider: { name: 'Anthropic', share: 72, cost: 120 },
  providerCount: 1,
  hasRequestData: true,
  cacheHitRate: 0,
  costPerMillion: 0,
  avgTokensPerRequest: 0,
  avgCostPerRequest: 0,
  avgModelsPerEntry: 0,
  avgDailyCost: 42,
  avgRequestsPerDay: 0,
  topDay: { date: '2026-04-10', cost: 120 },
  cheapestDay: { date: '2026-04-01', cost: 12 },
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

describe('SecondaryMetrics help text', () => {
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

  it('uses month-specific help text when viewMode is monthly', () => {
    render(
      <TooltipProvider>
        <SecondaryMetrics metrics={metrics} dailyCosts={[12, 24, 48]} viewMode="monthly" />
      </TooltipProvider>,
    )

    const infoTexts = screen.getAllByTestId('metric-info').map((node) => node.textContent)

    expect(infoTexts).toContain('Shows the month with the highest API cost in the current slice.')
    expect(infoTexts).toContain('Shows the average cost per active month in the current slice.')
  })

  it('uses year-specific help text when viewMode is yearly', () => {
    render(
      <TooltipProvider>
        <SecondaryMetrics metrics={metrics} dailyCosts={[12, 24, 48]} viewMode="yearly" />
      </TooltipProvider>,
    )

    const infoTexts = screen.getAllByTestId('metric-info').map((node) => node.textContent)

    expect(infoTexts).toContain('Shows the year with the highest API cost in the current slice.')
    expect(infoTexts).toContain('Shows the average cost per active year in the current slice.')
  })
})
