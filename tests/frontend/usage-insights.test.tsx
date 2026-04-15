// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsageInsights } from '@/components/features/insights/UsageInsights'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'

const metrics: DashboardMetrics = {
  totalCost: 5046.25,
  totalTokens: 7_742_241_363,
  activeDays: 63,
  topModel: { name: 'Opus 4.6', cost: 4000 },
  topRequestModel: { name: 'Opus 4.6', requests: 49999 },
  topTokenModel: { name: 'Opus 4.6', tokens: 5_300_000_000 },
  topModelShare: 79,
  topThreeModelsShare: 91,
  topProvider: { name: 'Anthropic', share: 96, cost: 4800 },
  providerCount: 3,
  hasRequestData: true,
  cacheHitRate: 95.1,
  costPerMillion: 0.65,
  avgTokensPerRequest: 96_700,
  avgCostPerRequest: 0.06,
  avgModelsPerEntry: 2.6,
  avgDailyCost: 80.1,
  avgRequestsPerDay: 1270.3,
  topDay: { date: '2026-03-06', cost: 366 },
  cheapestDay: null,
  busiestWeek: { start: '2026-03-28', end: '2026-04-03', cost: 1218 },
  weekendCostShare: 35,
  totalInput: 10,
  totalOutput: 5,
  totalCacheRead: 100,
  totalCacheCreate: 0,
  totalThinking: 1200,
  totalRequests: 80_029,
  weekOverWeekChange: null,
  requestVolatility: 1319,
  modelConcentrationIndex: 0,
  providerConcentrationIndex: 0,
}

describe('UsageInsights', () => {
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

  it('keeps the animated insight grid items stretched to full height', () => {
    render(
      <TooltipProvider>
        <UsageInsights metrics={metrics} viewMode="daily" totalCalendarDays={92} />
      </TooltipProvider>,
    )

    const grid = screen.getByTestId('usage-insights-grid')
    const motionItems = within(grid).getAllByTestId('usage-insight-motion-item')
    const cards = within(grid).getAllByTestId('usage-insight-card')

    expect(motionItems).toHaveLength(4)
    expect(cards).toHaveLength(4)
    motionItems.forEach((item) => expect(item).toHaveClass('h-full'))
    cards.forEach((card) => expect(card).toHaveClass('h-full'))
  })
})
