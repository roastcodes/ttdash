// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayMetrics } from '@/components/cards/TodayMetrics'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage, DashboardMetrics } from '@/types'

const emptyMetrics: DashboardMetrics = {
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

describe('phase 4 UI correctness', () => {
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

  it('falls back safely when today.modelsUsed is missing', () => {
    const today = {
      date: '2026-04-06',
      inputTokens: 50,
      outputTokens: 25,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 75,
      totalCost: 3,
      requestCount: 2,
      modelBreakdowns: [],
    } as unknown as DailyUsage

    render(
      <TooltipProvider>
        <TodayMetrics today={today} metrics={emptyMetrics} />
      </TooltipProvider>,
    )

    expect(screen.getByText('No request counters')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('avoids Infinity and NaN in the drill-down modal when a day has zero tokens', () => {
    const day: DailyUsage = {
      date: '2026-04-06',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      totalCost: 4,
      requestCount: 1,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 4,
          requestCount: 1,
        },
      ],
    }

    render(
      <TooltipProvider>
        <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />
      </TooltipProvider>,
    )

    expect(document.body.textContent).not.toContain('Infinity')
    expect(document.body.textContent).not.toContain('NaN')
    expect(screen.getAllByText('–').length).toBeGreaterThan(0)
  })

  it('uses the canonical token sum instead of a stale day.totalTokens value', () => {
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 1,
      totalCost: 5,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 60,
          outputTokens: 20,
          cacheCreationTokens: 10,
          cacheReadTokens: 10,
          thinkingTokens: 0,
          cost: 5,
          requestCount: 2,
        },
      ],
    }

    render(
      <TooltipProvider>
        <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />
      </TooltipProvider>,
    )

    expect(screen.getAllByText('100').length).toBeGreaterThan(0)
    expect(screen.getByText(/\$50\.0k/)).toBeInTheDocument()
    expect(screen.getByText('Cache Read 10.0%')).toBeInTheDocument()
  })
})
