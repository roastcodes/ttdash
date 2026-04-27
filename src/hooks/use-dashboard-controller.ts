import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useDashboardControllerActions } from '@/hooks/use-dashboard-controller-actions'
import { useDashboardControllerDerivedState } from '@/hooks/use-dashboard-controller-derived-state'
import { useDashboardControllerDialogs } from '@/hooks/use-dashboard-controller-dialogs'
import { useDashboardControllerDrillDown } from '@/hooks/use-dashboard-controller-drill-down'
import { useDashboardControllerEffects } from '@/hooks/use-dashboard-controller-effects'
import { useDashboardControllerShellState } from '@/hooks/use-dashboard-controller-shell-state'
import type { DashboardControllerViewModel } from '@/types/dashboard-controller'
import { useDeleteData, useUploadData, useUsageData } from '@/hooks/use-usage-data'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { downloadCSV } from '@/lib/csv-export'
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'
import { useToast } from '@/lib/toast'
import type { AppSettings } from '@/types'

export type {
  DashboardControllerViewModel,
  DashboardDialogsViewModel,
  DashboardFileInputsViewModel,
  DashboardShellViewModel,
  DashboardTestHooks,
  JsonDownloadRecord,
} from '@/types/dashboard-controller'

/** Creates the dashboard controller with default bootstrap settings. */
export function useDashboardController(
  initialSettingsError: string | null = null,
): DashboardControllerViewModel {
  return useDashboardControllerWithBootstrap(
    DEFAULT_APP_SETTINGS,
    false,
    null,
    initialSettingsError,
  )
}

/** Creates the full dashboard controller from bootstrap settings and live data. */
export function useDashboardControllerWithBootstrap(
  initialSettings: AppSettings,
  initialSettingsLoadedFromServer = false,
  initialSettingsFetchedAt: number | null = null,
  initialSettingsError: string | null = null,
): DashboardControllerViewModel {
  const { t, i18n } = useTranslation()
  const { data: usageData, isLoading, error: usageError } = useUsageData()
  const uploadMutation = useUploadData()
  const deleteMutation = useDeleteData()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [bootstrapSettingsError, setBootstrapSettingsError] = useState(initialSettingsError)

  const daily = useMemo(() => usageData?.daily ?? [], [usageData])
  const hasData = daily.length > 0
  const allProviders = useMemo(
    () => getUniqueProviders(daily.map((entry) => entry.modelsUsed)),
    [daily],
  )
  const allModelsFromData = useMemo(
    () => getUniqueModels(daily.map((entry) => entry.modelsUsed)),
    [daily],
  )

  const {
    settings,
    providerLimits,
    setTheme,
    setLanguage,
    saveSettings,
    isSaving,
    isLoading: settingsLoading,
    error: settingsError,
    hasFetchedAfterMount,
  } = useAppSettings(
    allProviders,
    initialSettings,
    initialSettingsLoadedFromServer,
    initialSettingsFetchedAt,
  )

  const isDark = settings.theme === 'dark'
  const dialogs = useDashboardControllerDialogs()

  useDashboardControllerEffects({
    theme: settings.theme,
    language: settings.language,
    i18n,
    bootstrapSettingsError,
    hasFetchedAfterMount,
    settingsError,
    onClearBootstrapSettingsError: () => setBootstrapSettingsError(null),
    onOpenSettings: dialogs.openSettings,
  })

  const derived = useDashboardControllerDerivedState({
    daily,
    hasData,
    allProviders,
    allModelsFromData,
    settings,
    locale: i18n.resolvedLanguage ?? i18n.language,
  })

  const actions = useDashboardControllerActions({
    settings,
    usageData,
    isDark,
    viewMode: derived.filters.viewMode,
    selectedMonth: derived.filters.selectedMonth,
    selectedProviders: derived.filters.selectedProviders,
    selectedModels: derived.filters.selectedModels,
    ...(derived.filters.startDate ? { startDate: derived.filters.startDate } : {}),
    ...(derived.filters.endDate ? { endDate: derived.filters.endDate } : {}),
    setStartDate: derived.filters.setStartDate,
    setEndDate: derived.filters.setEndDate,
    applyDefaultFilters: derived.filters.applyDefaultFilters,
    applyPreset: derived.filters.applyPreset,
    setTheme,
    setLanguage,
    saveSettings,
    isSaving,
    queryClient,
    addToast,
    t,
    i18n,
    uploadUsageData: uploadMutation.mutateAsync,
    deleteUsageData: deleteMutation.mutateAsync,
    onClearBootstrapSettingsError: () => setBootstrapSettingsError(null),
  })

  const drillDown = useDashboardControllerDrillDown(derived.filters.filteredData)

  const shellState = useDashboardControllerShellState({
    settings,
    hasData: derived.hasData,
    dataSource: actions.dataSource,
    bootstrapSettingsError,
    settingsError,
    usageError,
    t,
    onRetryLoad: actions.onRetryLoad,
    onResetSettings: actions.onResetSettings,
    onDelete: actions.onDelete,
  })

  const handleExportCSV = useCallback(() => {
    downloadCSV(derived.filters.filteredData)
    addToast(t('toasts.csvExported'), 'success')
  }, [derived.filters.filteredData, addToast, t])

  return {
    fileInputs: actions.fileInputs,
    shell: {
      isLoading,
      settingsLoading,
      hasData: derived.hasData,
      isDark,
      animationKey: actions.animationKey,
      modelPaletteModelNames: allModelsFromData,
    },
    loadError: shellState.loadError,
    emptyState: {
      onUpload: actions.onUpload,
      onAutoImport: dialogs.openAutoImport,
      onOpenSettings: dialogs.openSettings,
    },
    header: {
      dateRange: derived.filters.dateRange,
      isDark,
      currentLanguage: settings.language,
      streak: derived.streak,
      dataSource: shellState.headerDataSource,
      startupAutoLoad: shellState.startupAutoLoadBadge,
      onHelpOpenChange: dialogs.setHelpOpen,
      onLanguageChange: actions.onLanguageChange,
      onToggleTheme: actions.onToggleTheme,
      onExportCSV: handleExportCSV,
      onDelete: () => void actions.onDelete(),
      onUpload: actions.onUpload,
      onAutoImport: dialogs.openAutoImport,
    },
    report: actions.report,
    filterBar: {
      viewMode: derived.filters.viewMode,
      onViewModeChange: derived.filters.setViewMode,
      selectedMonth: derived.filters.selectedMonth,
      onMonthChange: derived.filters.setSelectedMonth,
      availableMonths: derived.filters.availableMonths,
      availableProviders: derived.filters.availableProviders,
      selectedProviders: derived.filters.selectedProviders,
      onToggleProvider: derived.filters.toggleProvider,
      onClearProviders: derived.filters.clearProviders,
      allModels: derived.filterBarModels,
      selectedModels: derived.filters.selectedModels,
      onToggleModel: derived.filters.toggleModel,
      onClearModels: derived.filters.clearModels,
      ...(derived.filters.startDate ? { startDate: derived.filters.startDate } : {}),
      ...(derived.filters.endDate ? { endDate: derived.filters.endDate } : {}),
      onStartDateChange: derived.filters.setStartDate,
      onEndDateChange: derived.filters.setEndDate,
      onApplyPreset: actions.onApplyPreset,
      onResetAll: derived.filters.resetAll,
    },
    sections: {
      layout: {
        sectionOrder: settings.sectionOrder,
        sectionVisibility: settings.sectionVisibility,
      },
      overview: {
        metrics: derived.computed.metrics,
        viewMode: derived.filters.viewMode,
        totalCalendarDays: derived.totalCalendarDays,
        filteredData: derived.filters.filteredData,
        filteredDailyData: derived.filters.filteredDailyData,
        todayData: derived.todayData,
        hasCurrentMonthData: derived.hasCurrentMonthData,
        isDark,
      },
      forecast: {
        filteredData: derived.filters.filteredData,
        forecastState: derived.forecastState,
        metrics: derived.computed.metrics,
        viewMode: derived.filters.viewMode,
      },
      limits: {
        filteredDailyData: derived.filters.filteredDailyData,
        visibleLimitProviders: derived.visibleLimitProviders,
        providerLimits,
        selectedMonth: derived.filters.selectedMonth,
      },
      costAnalysis: {
        filteredData: derived.filters.filteredData,
        forecastState: derived.forecastState,
        allModels: derived.computed.allModels,
        costChartData: derived.computed.costChartData,
        modelPieData: derived.computed.modelPieData,
        modelCostChartData: derived.computed.modelCostChartData,
        weekdayData: derived.computed.weekdayData,
      },
      tokenAnalysis: {
        tokenChartData: derived.computed.tokenChartData,
        tokenPieData: derived.computed.tokenPieData,
      },
      requestAnalysis: {
        metrics: derived.computed.metrics,
        requestChartData: derived.computed.requestChartData,
        filteredData: derived.filters.filteredData,
        filteredDailyData: derived.filters.filteredDailyData,
        viewMode: derived.filters.viewMode,
      },
      advancedAnalysis: {
        metrics: derived.computed.metrics,
        filteredData: derived.filters.filteredData,
        viewMode: derived.filters.viewMode,
      },
      comparisons: {
        metrics: derived.computed.metrics,
        filteredData: derived.filters.filteredData,
        comparisonData: derived.filters.filteredDailyData,
        viewMode: derived.filters.viewMode,
      },
      tables: {
        metrics: derived.computed.metrics,
        filteredData: derived.filters.filteredData,
        modelCosts: derived.computed.modelCosts,
        providerMetrics: derived.computed.providerMetrics,
        viewMode: derived.filters.viewMode,
      },
      interactions: {
        onDrillDownDateChange: drillDown.onDrillDownDateChange,
      },
    },
    settingsModal: {
      open: dialogs.settingsOpen,
      onOpenChange: dialogs.setSettingsOpen,
      language: settings.language,
      reducedMotionPreference: settings.reducedMotionPreference,
      limitProviders: allProviders,
      filterProviders: derived.settingsProviderOptions,
      models: derived.settingsModelOptions,
      limits: settings.providerLimits,
      defaultFilters: settings.defaultFilters,
      sectionVisibility: settings.sectionVisibility,
      sectionOrder: settings.sectionOrder,
      lastLoadedAt: settings.lastLoadedAt,
      lastLoadSource: settings.lastLoadSource,
      cliAutoLoadActive: settings.cliAutoLoadActive,
      hasData: derived.hasData,
      onSaveSettings: actions.onSaveSettings,
      onExportSettings: actions.onExportSettings,
      onImportSettings: actions.onImportSettings,
      onExportData: actions.onExportData,
      onImportData: actions.onImportData,
      settingsBusy: actions.settingsBusy,
      dataBusy: actions.dataBusy,
    },
    dialogs: {
      helpPanel: {
        open: dialogs.helpOpen,
        onOpenChange: dialogs.setHelpOpen,
      },
      autoImport: {
        open: dialogs.autoImportOpen,
        onOpenChange: dialogs.setAutoImportOpen,
        onSuccess: actions.onAutoImportSuccess,
      },
      drillDown: drillDown.dialog,
    },
    commandPalette: {
      isDark,
      availableProviders: derived.filters.availableProviders,
      selectedProviders: derived.filters.selectedProviders,
      availableModels: derived.filters.availableModels,
      selectedModels: derived.filters.selectedModels,
      hasTodaySection: Boolean(derived.todayData),
      hasMonthSection: derived.hasCurrentMonthData,
      hasRequestSection: derived.computed.metrics.hasRequestData,
      sectionVisibility: settings.sectionVisibility,
      sectionOrder: settings.sectionOrder,
      reportGenerating: actions.report.generating,
      onToggleTheme: actions.onToggleTheme,
      onExportCSV: handleExportCSV,
      onGenerateReport: () => void actions.report.onGenerate(),
      onDelete: () => void actions.onDelete(),
      onUpload: actions.onUpload,
      onAutoImport: dialogs.openAutoImport,
      onOpenSettings: dialogs.openSettings,
      onScrollTo: actions.onScrollTo,
      onViewModeChange: derived.filters.setViewMode,
      onApplyPreset: actions.onApplyPreset,
      onToggleProvider: derived.filters.toggleProvider,
      onToggleModel: derived.filters.toggleModel,
      onClearProviders: derived.filters.clearProviders,
      onClearModels: derived.filters.clearModels,
      onClearDateRange: actions.onClearDateRange,
      onResetAll: derived.filters.resetAll,
      onHelp: dialogs.openHelp,
      onLanguageChange: actions.onLanguageChange,
    },
  }
}
