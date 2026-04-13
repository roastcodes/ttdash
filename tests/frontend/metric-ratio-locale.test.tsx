// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonthMetrics } from '@/components/cards/MonthMetrics'
import { PrimaryMetrics } from '@/components/cards/PrimaryMetrics'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getCurrentLocale, initI18n } from '@/lib/i18n'
import type { DailyUsage, DashboardMetrics } from '@/types'

const metrics: DashboardMetrics = {
  totalCost: 10,
  totalTokens: 25,
  activeDays: 2,
  topModel: null,
  topRequestModel: null,
  topTokenModel: null,
  topModelShare: 0,
  topThreeModelsShare: 0,
  topProvider: null,
  providerCount: 1,
  hasRequestData: true,
  cacheHitRate: 0,
  costPerMillion: 0,
  avgTokensPerRequest: 12.5,
  avgCostPerRequest: 5,
  avgModelsPerEntry: 1,
  avgDailyCost: 5,
  avgRequestsPerDay: 2,
  topDay: null,
  cheapestDay: null,
  busiestWeek: null,
  weekendCostShare: null,
  totalInput: 15,
  totalOutput: 10,
  totalCacheRead: 0,
  totalCacheCreate: 0,
  totalThinking: 0,
  totalRequests: 4,
  weekOverWeekChange: null,
  requestVolatility: 0,
  modelConcentrationIndex: 0,
  providerConcentrationIndex: 0,
}

describe('metric ratio localization', () => {
  const daily: DailyUsage[] = [
    {
      date: '2026-04-02',
      inputTokens: 10,
      outputTokens: 6,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 2,
      totalTokens: 18,
      totalCost: 4,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
    },
    {
      date: '2026-04-04',
      inputTokens: 5,
      outputTokens: 4,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 1,
      totalTokens: 10,
      totalCost: 6,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
    },
  ]

  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    await initI18n('de')
  })

  it('formats the primary metrics I/O ratio with the active locale', () => {
    const ratio = new Intl.NumberFormat(getCurrentLocale(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1.5)

    render(
      <TooltipProvider delayDuration={0}>
        <PrimaryMetrics metrics={metrics} />
      </TooltipProvider>,
    )

    expect(document.body.textContent).toContain(`${ratio}:1`)
  })

  it('formats the month metrics I/O ratio with the active locale', () => {
    const ratio = new Intl.NumberFormat(getCurrentLocale(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1.5)

    render(
      <TooltipProvider delayDuration={0}>
        <MonthMetrics daily={daily} metrics={metrics} />
      </TooltipProvider>,
    )

    expect(document.body.textContent).toContain(`${ratio}:1`)
  })

  it('formats month percentage subtitles with the active locale', () => {
    const thinkingShare = new Intl.NumberFormat(getCurrentLocale(), {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(3 / 28)
    const coverage = new Intl.NumberFormat(getCurrentLocale(), {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(2 / new Date().getDate())

    render(
      <TooltipProvider delayDuration={0}>
        <MonthMetrics daily={daily} metrics={metrics} />
      </TooltipProvider>,
    )

    expect(document.body.textContent).toContain(thinkingShare)
    expect(document.body.textContent).toContain(coverage)
  })
})
