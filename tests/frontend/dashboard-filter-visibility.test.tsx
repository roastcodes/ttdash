// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from '@/components/Dashboard'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'

const dashboardControllerMocks = vi.hoisted(() => ({
  useDashboardControllerWithBootstrap: vi.fn(),
}))

vi.mock('@/hooks/use-dashboard-controller', () => dashboardControllerMocks)
vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}))
vi.mock('@/components/layout/FilterBar', () => ({
  FilterBar: ({ allModels, selectedModels }: { allModels: string[]; selectedModels: string[] }) => (
    <div data-testid="filter-bar-props">
      {JSON.stringify({
        allModels,
        selectedModels,
      })}
    </div>
  ),
}))
vi.mock('@/components/dashboard/DashboardSections', () => ({
  DashboardSections: () => <div data-testid="dashboard-sections" />,
}))
vi.mock('@/components/features/command-palette/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}))
vi.mock('@/components/features/pdf-report/PDFReport', () => ({
  PDFReportButton: () => <div data-testid="pdf-report-button" />,
}))

function createController(overrides: Record<string, unknown> = {}) {
  return {
    fileInputRef: { current: null },
    settingsImportInputRef: { current: null },
    dataImportInputRef: { current: null },
    settings: {
      ...DEFAULT_APP_SETTINGS,
      language: 'en',
      lastLoadedAt: null,
      lastLoadSource: null,
      cliAutoLoadActive: false,
    },
    providerLimits: {},
    isLoading: false,
    settingsLoading: false,
    isSaving: false,
    isDark: false,
    hasData: true,
    helpOpen: false,
    setHelpOpen: vi.fn(),
    autoImportOpen: false,
    setAutoImportOpen: vi.fn(),
    settingsOpen: false,
    setSettingsOpen: vi.fn(),
    drillDownDate: null,
    setDrillDownDate: vi.fn(),
    drillDownDay: null,
    reportGenerating: false,
    settingsTransferBusy: false,
    dataTransferBusy: false,
    headerDataSource: null,
    startupAutoLoadBadge: null,
    animationSeed: 1,
    allProviders: [],
    allModelsFromData: ['Claude Sonnet 4.5', 'GPT-5.4'],
    settingsProviderOptions: [],
    settingsModelOptions: [],
    viewMode: 'daily',
    setViewMode: vi.fn(),
    selectedMonth: null,
    setSelectedMonth: vi.fn(),
    selectedProviders: [],
    toggleProvider: vi.fn(),
    clearProviders: vi.fn(),
    selectedModels: ['GPT-5.4'],
    toggleModel: vi.fn(),
    clearModels: vi.fn(),
    startDate: undefined,
    setStartDate: vi.fn(),
    endDate: undefined,
    setEndDate: vi.fn(),
    resetAll: vi.fn(),
    applyPreset: vi.fn(),
    filteredDailyData: [],
    filteredData: [],
    availableMonths: [],
    availableProviders: [],
    availableModels: ['Claude Sonnet 4.5'],
    dateRange: null,
    metrics: { hasRequestData: false },
    modelCosts: [],
    providerMetrics: [],
    costChartData: [],
    modelCostChartData: [],
    tokenChartData: [],
    requestChartData: [],
    weekdayData: [],
    allModels: [],
    modelPieData: [],
    tokenPieData: [],
    comparisonData: [],
    totalCalendarDays: 0,
    todayData: null,
    hasCurrentMonthData: false,
    visibleLimitProviders: [],
    sectionVisibility: {},
    sectionOrder: [],
    streak: null,
    fatalLoadState: null,
    handleUpload: vi.fn(),
    handleOpenSettings: vi.fn(),
    handleRetryLoad: vi.fn(),
    handleResetSettings: vi.fn(),
    handleToggleTheme: vi.fn(),
    handleSaveSettings: vi.fn(),
    handleLanguageChange: vi.fn(),
    handleFileChange: vi.fn(),
    handleDelete: vi.fn(),
    handleExportCSV: vi.fn(),
    handleGenerateReport: vi.fn(),
    handleAutoImport: vi.fn(),
    handleAutoImportSuccess: vi.fn(),
    handleExportSettings: vi.fn(),
    handleExportData: vi.fn(),
    handleImportSettings: vi.fn(),
    handleImportData: vi.fn(),
    handleSettingsImportChange: vi.fn(),
    handleDataImportChange: vi.fn(),
    handleScrollTo: vi.fn(),
    ...overrides,
  }
}

describe('Dashboard model filter visibility', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('keeps selected models visible in the FilterBar when they are filtered out of availableModels', () => {
    dashboardControllerMocks.useDashboardControllerWithBootstrap.mockReturnValue(createController())

    render(<Dashboard initialSettings={DEFAULT_APP_SETTINGS} />)

    const props = JSON.parse(screen.getByTestId('filter-bar-props').textContent ?? '{}') as {
      allModels: string[]
      selectedModels: string[]
    }

    expect(props.selectedModels).toEqual(['GPT-5.4'])
    expect(props.allModels).toEqual(['Claude Sonnet 4.5', 'GPT-5.4'])
  })
})
