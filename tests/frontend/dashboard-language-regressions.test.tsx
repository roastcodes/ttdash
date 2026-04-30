// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PrimaryMetrics } from '@/components/cards/PrimaryMetrics'
import { ChartCard } from '@/components/charts/ChartCard'
import { CommandPalette } from '@/components/features/command-palette/CommandPalette'
import { UsageInsights } from '@/components/features/insights/UsageInsights'
import { Header } from '@/components/layout/Header'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'
import { renderWithAppProviders } from '../test-utils'

type CommandPaletteProps = ComponentProps<typeof CommandPalette>

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

function buildCommandPaletteProps(
  overrides: Partial<CommandPaletteProps> = {},
): CommandPaletteProps {
  const noop = () => {}

  return {
    isDark: true,
    availableProviders: [],
    selectedProviders: [],
    availableModels: [],
    selectedModels: [],
    hasTodaySection: false,
    hasMonthSection: false,
    hasRequestSection: false,
    sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
    sectionOrder: [...DEFAULT_APP_SETTINGS.sectionOrder],
    reportGenerating: false,
    onToggleTheme: noop,
    onExportCSV: noop,
    onGenerateReport: noop,
    onDelete: noop,
    onUpload: noop,
    onAutoImport: noop,
    onOpenSettings: noop,
    onScrollTo: noop,
    onViewModeChange: noop,
    onApplyPreset: noop,
    onToggleProvider: noop,
    onToggleModel: noop,
    onClearProviders: noop,
    onClearModels: noop,
    onClearDateRange: noop,
    onResetAll: noop,
    onHelp: noop,
    onLanguageChange: noop,
    ...overrides,
  }
}

describe('Dashboard language regressions', () => {
  beforeAll(async () => {
    Element.prototype.scrollIntoView = vi.fn()
    await initI18n('de')
  })

  it('localizes expanded chart actions in German', () => {
    renderWithAppProviders(
      <ChartCard
        title="Kosten im Verlauf"
        chartData={[{ date: '2026-04-07', cost: 5 }]}
        valueKey="cost"
      >
        <div>Chart</div>
      </ChartCard>,
    )

    fireEvent.click(screen.getByRole('button', { name: /vergrössern/i }))

    expect(screen.getByRole('button', { name: 'CSV exportieren' })).toBeInTheDocument()
  })

  it('uses consistent German terminology on primary information paths', () => {
    renderWithAppProviders(
      <div>
        <Header
          dateRange={{ start: '2026-04-01', end: '2026-04-13' }}
          isDark={false}
          currentLanguage="de"
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
      </div>,
      { delayDuration: 0 },
    )

    expect(screen.getByText('22 Tage in Folge')).toBeInTheDocument()
    expect(screen.getByText('Einblicke')).toBeInTheDocument()
    expect(screen.getByText('Kurzfazit')).toBeInTheDocument()
    expect(document.body).toHaveTextContent('Input/Output-Verhältnis')
    expect(document.body).toHaveTextContent('pro Anfrage')
    expect(document.body).not.toHaveTextContent('Req-Lead')
    expect(document.body).not.toHaveTextContent('Quick Read')
    expect(document.body).not.toHaveTextContent('Streak')
  })

  it('localizes command palette action groups while keeping representative command ids renderable', async () => {
    renderWithAppProviders(<CommandPalette {...buildCommandPaletteProps()} />)

    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    expect(await screen.findByRole('dialog', { name: 'Command Palette' })).toBeInTheDocument()
    expect(screen.getByText('Daten laden')).toBeInTheDocument()
    expect(screen.getByText('Exporte')).toBeInTheDocument()
    expect(screen.getByText('Wartung')).toBeInTheDocument()
    expect(screen.getByTestId('command-auto-import')).toBeInTheDocument()
    expect(screen.getByTestId('command-csv')).toBeInTheDocument()
    expect(screen.getByTestId('command-settings-open')).toBeInTheDocument()
  })
})
