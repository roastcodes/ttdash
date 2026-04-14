import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { Header } from './layout/Header'
import { FilterBar } from './layout/FilterBar'
import { EmptyState } from './EmptyState'
import { LoadErrorState } from './LoadErrorState'
import { CommandPalette } from './features/command-palette/CommandPalette'
import { SettingsModal } from './features/settings/SettingsModal'
import { PDFReportButton } from './features/pdf-report/PDFReport'
import { DashboardSections } from './dashboard/DashboardSections'
import { DashboardSkeleton } from './ui/skeleton'
import { Button } from './ui/button'
import { useDashboardController } from '@/hooks/use-dashboard-controller'

const DrillDownModal = lazy(() =>
  import('./features/drill-down/DrillDownModal').then((module) => ({
    default: module.DrillDownModal,
  })),
)
const AutoImportModal = lazy(() =>
  import('./features/auto-import/AutoImportModal').then((module) => ({
    default: module.AutoImportModal,
  })),
)

interface DashboardProps {
  initialSettingsError?: string | null
}

export function Dashboard({ initialSettingsError = null }: DashboardProps) {
  const { t } = useTranslation()
  const controller = useDashboardController(initialSettingsError)
  const {
    fileInputRef,
    settingsImportInputRef,
    dataImportInputRef,
    settings,
    providerLimits,
    isLoading,
    settingsLoading,
    isSaving,
    isDark,
    hasData,
    helpOpen,
    setHelpOpen,
    autoImportOpen,
    setAutoImportOpen,
    settingsOpen,
    setSettingsOpen,
    drillDownDate,
    setDrillDownDate,
    drillDownDay,
    reportGenerating,
    settingsTransferBusy,
    dataTransferBusy,
    headerDataSource,
    startupAutoLoadBadge,
    animationSeed,
    daily,
    allProviders,
    settingsProviderOptions,
    settingsModelOptions,
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    selectedProviders,
    toggleProvider,
    clearProviders,
    selectedModels,
    toggleModel,
    clearModels,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    resetAll,
    applyPreset,
    filteredDailyData,
    filteredData,
    availableMonths,
    availableProviders,
    availableModels,
    dateRange,
    metrics,
    modelCosts,
    providerMetrics,
    costChartData,
    modelCostChartData,
    tokenChartData,
    requestChartData,
    weekdayData,
    allModels,
    modelPieData,
    tokenPieData,
    comparisonData,
    totalCalendarDays,
    todayData,
    hasCurrentMonthData,
    visibleLimitProviders,
    sectionVisibility,
    sectionOrder,
    streak,
    fatalLoadState,
    handleUpload,
    handleOpenSettings,
    handleRetryLoad,
    handleResetSettings,
    handleToggleTheme,
    handleSaveSettings,
    handleLanguageChange,
    handleFileChange,
    handleDelete,
    handleExportCSV,
    handleGenerateReport,
    handleAutoImport,
    handleAutoImportSuccess,
    handleExportSettings,
    handleExportData,
    handleImportSettings,
    handleImportData,
    handleSettingsImportChange,
    handleDataImportChange,
    handleScrollTo,
  } = controller

  const fileInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
        data-testid="usage-upload-input"
      />
      <input
        ref={settingsImportInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleSettingsImportChange}
        data-testid="settings-import-input"
      />
      <input
        ref={dataImportInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleDataImportChange}
        data-testid="data-import-input"
      />
    </>
  )

  const autoImportDialog = (
    <Suspense fallback={null}>
      {autoImportOpen && (
        <AutoImportModal
          open={autoImportOpen}
          onOpenChange={setAutoImportOpen}
          onSuccess={handleAutoImportSuccess}
        />
      )}
    </Suspense>
  )

  const settingsDialog = (
    <SettingsModal
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      language={settings.language}
      limitProviders={allProviders}
      filterProviders={settingsProviderOptions}
      models={settingsModelOptions}
      limits={settings.providerLimits}
      defaultFilters={settings.defaultFilters}
      sectionVisibility={settings.sectionVisibility}
      sectionOrder={settings.sectionOrder}
      lastLoadedAt={settings.lastLoadedAt}
      lastLoadSource={settings.lastLoadSource}
      cliAutoLoadActive={settings.cliAutoLoadActive}
      hasData={hasData}
      onSaveSettings={handleSaveSettings}
      onExportSettings={handleExportSettings}
      onImportSettings={handleImportSettings}
      onExportData={handleExportData}
      onImportData={handleImportData}
      settingsBusy={settingsTransferBusy || isSaving}
      dataBusy={dataTransferBusy}
    />
  )

  if (!fatalLoadState && (isLoading || settingsLoading)) {
    return <DashboardSkeleton />
  }

  if (fatalLoadState) {
    const actions = [
      {
        label: t('loadError.retry'),
        onClick: () => void handleRetryLoad(),
        variant: 'default' as const,
      },
      ...(fatalLoadState.canResetSettings
        ? [{ label: t('loadError.resetSettings'), onClick: () => void handleResetSettings() }]
        : []),
      ...(fatalLoadState.canResetUsage
        ? [{ label: t('loadError.deleteData'), onClick: () => void handleDelete() }]
        : []),
    ]

    return (
      <>
        <LoadErrorState
          title={fatalLoadState.title}
          description={fatalLoadState.description}
          details={fatalLoadState.details}
          detailLabel={t('loadError.details')}
          actions={actions}
        />
        {fileInputs}
      </>
    )
  }

  if (!hasData) {
    return (
      <>
        <EmptyState
          onUpload={handleUpload}
          onAutoImport={handleAutoImport}
          onOpenSettings={handleOpenSettings}
        />
        {fileInputs}
        {autoImportDialog}
        {settingsDialog}
      </>
    )
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 pb-8">
      {fileInputs}

      <Header
        dateRange={dateRange}
        isDark={isDark}
        currentLanguage={settings.language}
        helpOpen={helpOpen}
        streak={streak}
        dataSource={headerDataSource}
        startupAutoLoad={startupAutoLoadBadge}
        onHelpOpenChange={setHelpOpen}
        onLanguageChange={handleLanguageChange}
        onToggleTheme={handleToggleTheme}
        onExportCSV={handleExportCSV}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onAutoImport={handleAutoImport}
        settingsButton={
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            title={t('header.settings')}
            className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{t('header.settings')}</span>
          </Button>
        }
        pdfButton={
          <PDFReportButton generating={reportGenerating} onGenerate={handleGenerateReport} />
        }
      />

      <div id="filters">
        <FilterBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          availableMonths={availableMonths}
          availableProviders={availableProviders}
          selectedProviders={selectedProviders}
          onToggleProvider={toggleProvider}
          onClearProviders={clearProviders}
          allModels={availableModels}
          selectedModels={selectedModels}
          onToggleModel={toggleModel}
          onClearModels={clearModels}
          {...(startDate ? { startDate } : {})}
          {...(endDate ? { endDate } : {})}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApplyPreset={applyPreset}
          onResetAll={resetAll}
        />
      </div>

      <div
        key={`${animationSeed}-${daily.length}-${daily[daily.length - 1]?.date ?? 'empty'}-${Math.round(metrics.totalCost)}`}
        className="mt-4 space-y-4"
      >
        <DashboardSections
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
          metrics={metrics}
          viewMode={viewMode}
          totalCalendarDays={totalCalendarDays}
          filteredData={filteredData}
          filteredDailyData={filteredDailyData}
          todayData={todayData}
          hasCurrentMonthData={hasCurrentMonthData}
          visibleLimitProviders={visibleLimitProviders}
          providerLimits={providerLimits}
          selectedMonth={selectedMonth}
          allModels={allModels}
          costChartData={costChartData}
          modelPieData={modelPieData}
          modelCostChartData={modelCostChartData}
          weekdayData={weekdayData}
          tokenChartData={tokenChartData}
          tokenPieData={tokenPieData}
          requestChartData={requestChartData}
          comparisonData={comparisonData}
          modelCosts={modelCosts}
          providerMetrics={providerMetrics}
          onDrillDownDateChange={setDrillDownDate}
        />
      </div>

      <Suspense fallback={null}>
        {drillDownDate !== null && (
          <DrillDownModal
            day={drillDownDay}
            contextData={filteredData}
            open={true}
            onClose={() => setDrillDownDate(null)}
          />
        )}
      </Suspense>

      <CommandPalette
        isDark={isDark}
        availableProviders={availableProviders}
        selectedProviders={selectedProviders}
        availableModels={availableModels}
        selectedModels={selectedModels}
        hasTodaySection={Boolean(todayData)}
        hasMonthSection={hasCurrentMonthData}
        hasRequestSection={metrics.hasRequestData}
        sectionVisibility={sectionVisibility}
        sectionOrder={sectionOrder}
        reportGenerating={reportGenerating}
        onToggleTheme={handleToggleTheme}
        onExportCSV={handleExportCSV}
        onGenerateReport={handleGenerateReport}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onAutoImport={handleAutoImport}
        onOpenSettings={handleOpenSettings}
        onScrollTo={handleScrollTo}
        onViewModeChange={setViewMode}
        onApplyPreset={applyPreset}
        onToggleProvider={toggleProvider}
        onToggleModel={toggleModel}
        onClearProviders={clearProviders}
        onClearModels={clearModels}
        onClearDateRange={() => {
          setStartDate(undefined)
          setEndDate(undefined)
        }}
        onResetAll={resetAll}
        onHelp={() => setHelpOpen(true)}
        onLanguageChange={handleLanguageChange}
      />

      {autoImportDialog}
      {settingsDialog}
    </div>
  )
}
