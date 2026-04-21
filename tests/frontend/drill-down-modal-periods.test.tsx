// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { renderDrillDownModal } from './drill-down-modal-test-helpers'

describe('DrillDownModal period views', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('labels aggregated entries as periods and shows raw-day coverage', () => {
    const monthEntry: DailyUsage = {
      date: '2026-04',
      inputTokens: 900,
      outputTokens: 300,
      cacheCreationTokens: 100,
      cacheReadTokens: 400,
      thinkingTokens: 0,
      totalTokens: 1700,
      totalCost: 42,
      requestCount: 12,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 900,
          outputTokens: 300,
          cacheCreationTokens: 100,
          cacheReadTokens: 400,
          thinkingTokens: 0,
          cost: 42,
          requestCount: 12,
        },
      ],
      _aggregatedDays: 30,
    }

    renderDrillDownModal({
      day: monthEntry,
      contextData: [monthEntry],
      hasPrevious: false,
      hasNext: false,
      currentIndex: 1,
      totalCount: 1,
    })

    expect(
      screen.getByText(
        'Detailed month view with benchmarks, model breakdown, provider summary, and token distribution.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Type: month')).toBeInTheDocument()
    expect(screen.getAllByText('30 raw days').length).toBeGreaterThan(0)
  })

  it('uses period-aware benchmark labels for monthly and yearly drilldowns', () => {
    const monthlyEntry: DailyUsage = {
      date: '2026-04',
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 160,
      totalCost: 12,
      requestCount: 4,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
      _aggregatedDays: 30,
    }
    const previousMonth: DailyUsage = {
      ...monthlyEntry,
      date: '2026-03',
      totalCost: 10,
      requestCount: 3,
    }
    const yearlyEntry: DailyUsage = {
      ...monthlyEntry,
      date: '2026',
      totalCost: 120,
      requestCount: 40,
      _aggregatedDays: 365,
    }
    const previousYear: DailyUsage = {
      ...yearlyEntry,
      date: '2025',
      totalCost: 100,
      requestCount: 35,
    }

    const { rerender } = renderDrillDownModal({
      day: monthlyEntry,
      contextData: [previousMonth, monthlyEntry],
      hasPrevious: true,
      hasNext: false,
      currentIndex: 2,
      totalCount: 2,
    })

    expect(screen.getByText('Cost vs. 1M avg')).toBeInTheDocument()

    rerender(
      <DrillDownModal
        day={yearlyEntry}
        contextData={[previousYear, yearlyEntry]}
        open
        hasPrevious={true}
        hasNext={false}
        currentIndex={2}
        totalCount={2}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Cost vs. 1Y avg')).toBeInTheDocument()
  })
})
