// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { TodayMetrics } from '@/components/cards/TodayMetrics'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage, DashboardMetrics } from '@/types'
import { renderWithAppProviders } from '../test-utils'

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

describe('TodayMetrics regressions', () => {
  beforeAll(async () => {
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

    renderWithAppProviders(<TodayMetrics today={today} metrics={emptyMetrics} />)

    expect(screen.getByText('No request counters')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument()
  })
})
