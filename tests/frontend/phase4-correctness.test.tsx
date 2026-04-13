// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayMetrics } from '@/components/cards/TodayMetrics'
import { PrimaryMetrics } from '@/components/cards/PrimaryMetrics'
import { ChartCard } from '@/components/charts/ChartCard'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { UsageInsights } from '@/components/features/insights/UsageInsights'
import { Header } from '@/components/layout/Header'
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

  it('localizes drill-down labels in English', async () => {
    await initI18n('en')

    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 100,
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

    expect(
      screen.getByText(
        'Detailed daily view with token distribution, model shares, requests, and thinking tokens.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Token distribution')).toBeInTheDocument()
    expect(screen.getByText('Cost rank')).toBeInTheDocument()
  })

  it('localizes expanded chart actions in German', async () => {
    await initI18n('de')

    render(
      <TooltipProvider>
        <ChartCard
          title="Kosten im Verlauf"
          chartData={[{ date: '2026-04-07', cost: 5 }]}
          valueKey="cost"
        >
          <div>Chart</div>
        </ChartCard>
      </TooltipProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /vergrössern/i }))

    expect(screen.getByRole('button', { name: 'CSV exportieren' })).toBeInTheDocument()
  })

  it('uses consistent German terminology on primary information paths', async () => {
    await initI18n('de')

    render(
      <TooltipProvider delayDuration={0}>
        <div>
          <Header
            dateRange={{ start: '2026-04-01', end: '2026-04-13' }}
            isDark={false}
            currentLanguage="de"
            helpOpen={false}
            streak={22}
            dataSource={null}
            startupAutoLoad={null}
            onHelpOpenChange={() => {}}
            onLanguageChange={() => {}}
            onToggleTheme={() => {}}
            onExportCSV={() => {}}
            onDelete={() => {}}
            onUpload={() => {}}
            onAutoImport={() => {}}
          />
          <PrimaryMetrics
            metrics={{
              ...emptyMetrics,
              totalCost: 5046.25,
              totalTokens: 7_742_241_363,
              activeDays: 63,
              topModel: { name: 'Opus 4.6', cost: 4000 },
              topRequestModel: { name: 'Opus 4.6', requests: 49999 },
              topModelShare: 79,
              providerCount: 3,
              hasRequestData: true,
              cacheHitRate: 95.1,
              costPerMillion: 0.65,
              avgTokensPerRequest: 96700,
              avgCostPerRequest: 0.06,
              avgDailyCost: 80.1,
              avgRequestsPerDay: 1270.3,
              totalInput: 10,
              totalOutput: 5,
              totalCacheRead: 100,
              totalRequests: 80029,
              requestVolatility: 1319,
            }}
            totalCalendarDays={92}
          />
          <UsageInsights
            metrics={{
              ...emptyMetrics,
              topProvider: { name: 'Anthropic', share: 96, cost: 4800 },
              topModel: { name: 'Opus 4.6', cost: 4000 },
              topRequestModel: { name: 'Opus 4.6', requests: 49999 },
              topTokenModel: { name: 'Opus 4.6', tokens: 5300000000 },
              topThreeModelsShare: 91,
              topModelShare: 79,
              activeDays: 63,
              avgDailyCost: 80.1,
              avgRequestsPerDay: 1270.3,
              avgTokensPerRequest: 96700,
              avgCostPerRequest: 0.06,
              hasRequestData: true,
              costPerMillion: 0.65,
              providerCount: 3,
              avgModelsPerEntry: 2.6,
              weekendCostShare: 35,
              totalThinking: 1200,
              totalTokens: 7742241363,
              totalRequests: 80029,
              requestVolatility: 1319,
              busiestWeek: { start: '2026-03-28', end: '2026-04-03', cost: 1218 },
              topDay: { date: '2026-03-06', cost: 366 },
            }}
            viewMode="daily"
            totalCalendarDays={92}
          />
        </div>
      </TooltipProvider>,
    )

    expect(screen.getByText('22 Tage in Folge')).toBeInTheDocument()
    expect(screen.getByText('Einblicke')).toBeInTheDocument()
    expect(screen.getByText('Kurzfazit')).toBeInTheDocument()
    expect(document.body.textContent).toContain('Input/Output-Verhältnis')
    expect(document.body.textContent).toContain('pro Request')
    expect(document.body.textContent).not.toContain('Req-Lead')
    expect(document.body.textContent).not.toContain('Quick Read')
    expect(document.body.textContent).not.toContain('Streak')
  })
})
