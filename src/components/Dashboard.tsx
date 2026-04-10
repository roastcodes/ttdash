import { lazy, Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { Header } from './layout/Header'
import { FilterBar } from './layout/FilterBar'
import { PrimaryMetrics } from './cards/PrimaryMetrics'
import { SecondaryMetrics } from './cards/SecondaryMetrics'
import { TodayMetrics } from './cards/TodayMetrics'
import { MonthMetrics } from './cards/MonthMetrics'
import { CostOverTime } from './charts/CostOverTime'
import { CostByModel } from './charts/CostByModel'
import { CostByModelOverTime } from './charts/CostByModelOverTime'
import { CumulativeCost } from './charts/CumulativeCost'
import { TokensOverTime } from './charts/TokensOverTime'
import { RequestsOverTime } from './charts/RequestsOverTime'
import { RequestCacheHitRateByModel } from './charts/RequestCacheHitRateByModel'
import { TokenTypes } from './charts/TokenTypes'
import { CostByWeekday } from './charts/CostByWeekday'
import { TokenEfficiency } from './charts/TokenEfficiency'
import { ModelMix } from './charts/ModelMix'
import { DistributionAnalysis } from './charts/DistributionAnalysis'
import { CorrelationAnalysis } from './charts/CorrelationAnalysis'
import { ModelEfficiency } from './tables/ModelEfficiency'
import { ProviderEfficiency } from './tables/ProviderEfficiency'
import { RecentDays } from './tables/RecentDays'
import { EmptyState } from './EmptyState'
import { HeatmapCalendar } from './features/heatmap/HeatmapCalendar'
import { CostForecast } from './features/forecast/CostForecast'
import { CacheROI } from './features/cache-roi/CacheROI'
import { PeriodComparison } from './features/comparison/PeriodComparison'
import { AnomalyDetection } from './features/anomaly/AnomalyDetection'
import { UsageInsights } from './features/insights/UsageInsights'
import { ConcentrationRisk } from './features/risk/ConcentrationRisk'
import { RequestQuality } from './features/request-quality/RequestQuality'
import { PDFReportButton } from './features/pdf-report/PDFReport'
import { CommandPalette } from './features/command-palette/CommandPalette'
import { FadeIn } from './features/animations/FadeIn'
import { SectionHeader } from './ui/section-header'
import { ExpandableCard } from './ui/expandable-card'
import { DashboardSkeleton } from './ui/skeleton'
import { Button } from './ui/button'
import { useUsageData, useUploadData, useDeleteData } from '@/hooks/use-usage-data'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useToast } from '@/components/ui/toast'
import { applyTheme } from '@/lib/app-settings'
import { downloadCSV } from '@/lib/csv-export'
import { VERSION } from '@/lib/constants'
import { SECTION_HELP } from '@/lib/help-content'
import { generatePdfReport, importSettings, importUsageData } from '@/lib/api'
import { formatCurrency, formatDateTimeCompact, formatDateTimeFull, formatTokens, formatPercent, periodUnit, localToday, toLocalDateStr } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import { getUniqueProviders } from '@/lib/model-utils'
import { SettingsModal } from './features/settings/SettingsModal'
import { ProviderLimitsSection } from './features/limits/ProviderLimitsSection'
import type { AppLanguage } from '@/types'

const DrillDownModal = lazy(() => import('./features/drill-down/DrillDownModal').then(module => ({ default: module.DrillDownModal })))
const AutoImportModal = lazy(() => import('./features/auto-import/AutoImportModal').then(module => ({ default: module.AutoImportModal })))
const SETTINGS_BACKUP_KIND = 'ttdash-settings-backup'
const USAGE_BACKUP_KIND = 'ttdash-usage-backup'
const BACKUP_FORMAT_VERSION = 1

type JsonDownloadRecord = {
  filename: string
  mimeType: string
  size: number
  text: string
}

type DashboardTestHooks = {
  onJsonDownload?: (record: JsonDownloadRecord) => void
  openSettings?: () => void
}

function downloadJsonFile(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const globalWindow = window as Window & {
    __TTDASH_TEST_HOOKS__?: DashboardTestHooks
  }
  globalWindow.__TTDASH_TEST_HOOKS__?.onJsonDownload?.({
    filename,
    mimeType: blob.type,
    size: blob.size,
    text,
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const { data: usageData, isLoading } = useUsageData()
  const uploadMutation = useUploadData()
  const deleteMutation = useDeleteData()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsImportInputRef = useRef<HTMLInputElement>(null)
  const dataImportInputRef = useRef<HTMLInputElement>(null)
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [autoImportOpen, setAutoImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [settingsTransferBusy, setSettingsTransferBusy] = useState(false)
  const [dataTransferBusy, setDataTransferBusy] = useState(false)
  const [dataSource, setDataSource] = useState<{ type: 'stored' | 'auto-import' | 'file'; label?: string; time?: string; title?: string } | null>(null)
  const [animationSeed, setAnimationSeed] = useState(0)

  const daily = usageData?.daily ?? []
  const hasData = daily.length > 0
  const allProviders = useMemo(() => getUniqueProviders(daily.map(d => d.modelsUsed)), [daily])
  const {
    settings,
    providerLimits,
    setTheme,
    setLanguage,
    setProviderLimits,
    isSaving,
  } = useAppSettings(allProviders)
  const isDark = settings.theme === 'dark'

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (i18n.resolvedLanguage !== settings.language) {
      void i18n.changeLanguage(settings.language)
    }
  }, [i18n, settings.language])

  useEffect(() => {
    const globalWindow = window as Window & {
      __TTDASH_TEST_HOOKS__?: DashboardTestHooks
    }

    if (!globalWindow.__TTDASH_TEST_HOOKS__) {
      return undefined
    }

    globalWindow.__TTDASH_TEST_HOOKS__.openSettings = () => {
      setSettingsOpen(true)
    }

    return () => {
      if (globalWindow.__TTDASH_TEST_HOOKS__?.openSettings) {
        delete globalWindow.__TTDASH_TEST_HOOKS__.openSettings
      }
    }
  }, [])

  const persistedLoadedTime = useMemo(
    () => settings.lastLoadedAt ? formatDateTimeCompact(settings.lastLoadedAt) : undefined,
    [settings.lastLoadedAt, i18n.resolvedLanguage],
  )
  const persistedLoadedTitle = useMemo(
    () => settings.lastLoadedAt ? t('header.loadedAt', { time: formatDateTimeFull(settings.lastLoadedAt) }) : undefined,
    [settings.lastLoadedAt, i18n.resolvedLanguage, t],
  )
  const persistedDataSource = useMemo(() => {
    if (!hasData) return null

    return {
      type: 'stored' as const,
      time: persistedLoadedTime,
      title: persistedLoadedTitle,
    }
  }, [hasData, persistedLoadedTime, persistedLoadedTitle])
  const headerDataSource = dataSource ?? persistedDataSource
  const startupAutoLoadBadge = useMemo(() => (
    settings.cliAutoLoadActive
      ? {
          active: true,
          time: persistedLoadedTime,
          title: settings.lastLoadedAt
            ? t('header.autoLoadAt', { time: formatDateTimeFull(settings.lastLoadedAt) })
            : t('header.autoLoadActive'),
        }
      : null
  ), [settings.cliAutoLoadActive, settings.lastLoadedAt, persistedLoadedTime, i18n.resolvedLanguage, t])

  const {
    viewMode, setViewMode,
    selectedMonth, setSelectedMonth,
    selectedProviders, toggleProvider, clearProviders,
    selectedModels, toggleModel, clearModels,
    startDate, setStartDate,
    endDate, setEndDate,
    resetAll,
    applyPreset,
    filteredDailyData,
    filteredData,
    availableMonths,
    availableProviders,
    availableModels,
    dateRange,
  } = useDashboardFilters(daily)

  const {
    metrics, modelCosts, providerMetrics, costChartData, modelCostChartData,
    tokenChartData, requestChartData, weekdayData, allModels, modelPieData, tokenPieData,
  } = useComputedMetrics(filteredData, viewMode)

  // Full dataset with only model filter applied (no date/month filter) for PeriodComparison
  const comparisonData = filteredDailyData

  // Calculate total calendar days from the date range (only meaningful for daily view)
  const totalCalendarDays = useMemo(() => {
    if (!dateRange || viewMode !== 'daily') return 0
    const start = new Date(dateRange.start + 'T00:00:00')
    const end = new Date(dateRange.end + 'T00:00:00')
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [dateRange, viewMode])

  const todayStr = localToday()
  const todayData = useMemo(() => filteredDailyData.find(d => d.date === todayStr) ?? null, [filteredDailyData, todayStr])
  const hasCurrentMonthData = useMemo(() => filteredDailyData.some(d => d.date.startsWith(todayStr.slice(0, 7))), [filteredDailyData, todayStr])
  const visibleLimitProviders = useMemo(() => (
    selectedProviders.length > 0 ? selectedProviders : allProviders
  ), [selectedProviders, allProviders])

  // Compute active streak (consecutive days from today backwards)
  const streak = useMemo(() => {
    const dates = new Set(filteredDailyData.map(d => d.date))
    let count = 0
    const d = new Date(todayStr + 'T00:00:00')
    while (dates.has(toLocalDateStr(d))) {
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [filteredDailyData, todayStr])

  const drillDownDay = useMemo(() => {
    if (!drillDownDate) return null
    return filteredData.find(d => d.date === drillDownDate) ?? null
  }, [drillDownDate, filteredData])

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const handleToggleTheme = useCallback(() => {
    void setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  const handleLanguageChange = useCallback((language: AppLanguage) => {
    if (settings.language !== language) {
      void setLanguage(language)
    }
    if (i18n.resolvedLanguage !== language) {
      void i18n.changeLanguage(language)
    }
  }, [i18n, setLanguage, settings.language])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await uploadMutation.mutateAsync(json)
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setAnimationSeed(prev => prev + 1)
      const now = new Date()
      const time = now.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })
      setDataSource({
        type: 'file',
        label: file.name,
        time,
        title: `${file.name} · ${t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) })}`,
      })
      addToast(t('toasts.fileLoaded', { name: file.name }), 'success')
    } catch {
      addToast(t('toasts.fileReadFailed'), 'error')
    }
    e.target.value = ''
  }, [uploadMutation, addToast, t])

  const handleDelete = useCallback(async () => {
    await deleteMutation.mutateAsync()
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    setAnimationSeed(prev => prev + 1)
    setDataSource(null)
    addToast(t('toasts.dataDeleted'), 'info')
  }, [deleteMutation, queryClient, addToast, t])

  const handleExportCSV = useCallback(() => {
    downloadCSV(filteredData)
    addToast(t('toasts.csvExported'), 'success')
  }, [filteredData, addToast, t])

  const handleGenerateReport = useCallback(async () => {
    if (reportGenerating) return
    setReportGenerating(true)

    try {
      const blob = await generatePdfReport({
        viewMode,
        selectedMonth,
        selectedProviders,
        selectedModels,
        startDate,
        endDate,
        language: i18n.language === 'en' ? 'en' : 'de',
      })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      addToast(t('commandPalette.commands.generateReport.label'), 'success')
    } catch (error) {
      console.error('PDF generation failed:', error)
      addToast(`${t('api.pdfFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setReportGenerating(false)
    }
  }, [reportGenerating, viewMode, selectedMonth, selectedProviders, selectedModels, startDate, endDate, addToast])

  const handleAutoImport = useCallback(() => {
    setAutoImportOpen(true)
  }, [])

  const handleAutoImportSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    setAnimationSeed(prev => prev + 1)
    const now = new Date()
    const time = now.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })
    setDataSource({
      type: 'auto-import',
      time,
      title: t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) }),
    })
    addToast(t('toasts.dataImported'), 'success')
  }, [queryClient, addToast, t])

  const handleExportSettings = useCallback(() => {
    downloadJsonFile(`ttdash-settings-backup-${localToday()}.json`, {
      kind: SETTINGS_BACKUP_KIND,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      settings: {
        language: settings.language,
        theme: settings.theme,
        providerLimits: settings.providerLimits,
        lastLoadedAt: settings.lastLoadedAt,
        lastLoadSource: settings.lastLoadSource,
      },
    })
    addToast(t('toasts.settingsExported'), 'success')
  }, [settings, addToast, t])

  const handleExportData = useCallback(() => {
    if (!usageData || usageData.daily.length === 0) {
      addToast(t('toasts.noDataToExport'), 'info')
      return
    }

    downloadJsonFile(`ttdash-data-backup-${localToday()}.json`, {
      kind: USAGE_BACKUP_KIND,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      data: usageData,
    })
    addToast(t('toasts.dataExported'), 'success')
  }, [usageData, addToast, t])

  const handleImportSettings = useCallback(() => {
    settingsImportInputRef.current?.click()
  }, [])

  const handleImportData = useCallback(() => {
    dataImportInputRef.current?.click()
  }, [])

  const handleSettingsImportChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSettingsTransferBusy(true)
    try {
      const parsed = JSON.parse(await file.text())
      const imported = await importSettings(parsed)
      queryClient.setQueryData(['settings'], imported)
      addToast(t('toasts.settingsImported', { name: file.name }), 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('toasts.fileReadFailed'), 'error')
    } finally {
      setSettingsTransferBusy(false)
      e.target.value = ''
    }
  }, [queryClient, addToast, t])

  const handleDataImportChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setDataTransferBusy(true)
    try {
      const parsed = JSON.parse(await file.text())
      const summary = await importUsageData(parsed)
      await queryClient.invalidateQueries({ queryKey: ['usage'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      setAnimationSeed(prev => prev + 1)
      const now = new Date()
      const time = now.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })
      setDataSource({
        type: 'file',
        label: file.name,
        time,
        title: `${file.name} · ${t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) })}`,
      })

      const toastType: 'info' | 'success' = summary.conflictingDays > 0 ? 'info' : 'success'
      const toastKey = summary.conflictingDays > 0 ? 'toasts.dataBackupImportedWithConflicts' : 'toasts.dataBackupImported'
      addToast(t(toastKey, {
        added: summary.addedDays,
        unchanged: summary.unchangedDays,
        conflicts: summary.conflictingDays,
      }), toastType)
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('toasts.fileReadFailed'), 'error')
    } finally {
      setDataTransferBusy(false)
      e.target.value = ''
    }
  }, [queryClient, addToast, t])

  const handleScrollTo = useCallback((section: string) => {
    const el = document.getElementById(section)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!hasData) {
    return (
      <>
        <EmptyState onUpload={handleUpload} onAutoImport={handleAutoImport} onOpenSettings={handleOpenSettings} />
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} data-testid="usage-upload-input" />
        <input ref={settingsImportInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleSettingsImportChange} data-testid="settings-import-input" />
        <input ref={dataImportInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleDataImportChange} data-testid="data-import-input" />
        <Suspense fallback={null}>
          {autoImportOpen && <AutoImportModal open={autoImportOpen} onOpenChange={setAutoImportOpen} onSuccess={handleAutoImportSuccess} />}
        </Suspense>
        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          providers={allProviders}
          limits={providerLimits}
          lastLoadedAt={settings.lastLoadedAt}
          lastLoadSource={settings.lastLoadSource}
          cliAutoLoadActive={settings.cliAutoLoadActive}
          hasData={false}
          onSaveLimits={setProviderLimits}
          onExportSettings={handleExportSettings}
          onImportSettings={handleImportSettings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          settingsBusy={settingsTransferBusy || isSaving}
          dataBusy={dataTransferBusy}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 pb-8">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} data-testid="usage-upload-input" />
      <input ref={settingsImportInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleSettingsImportChange} data-testid="settings-import-input" />
      <input ref={dataImportInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleDataImportChange} data-testid="data-import-input" />

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
        settingsButton={(
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            title={t('header.settings')}
            className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{t('header.settings')}</span>
          </Button>
        )}
        pdfButton={(
          <PDFReportButton
            generating={reportGenerating}
            onGenerate={handleGenerateReport}
          />
        )}
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
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApplyPreset={applyPreset}
          onResetAll={resetAll}
        />
      </div>

      <div key={`${animationSeed}-${daily.length}-${daily[daily.length - 1]?.date ?? 'empty'}-${Math.round(metrics.totalCost)}`} className="space-y-4 mt-4">
        <div id="insights">
          <UsageInsights metrics={metrics} viewMode={viewMode} totalCalendarDays={totalCalendarDays} />
        </div>

        {/* Primary Metrics */}
        <div id="metrics">
          <SectionHeader title={t('dashboard.metrics.title')} badge={t('dashboard.metrics.badge')} description={t('dashboard.metrics.description')} info={SECTION_HELP.metrics} />
          <FadeIn delay={0}>
            <PrimaryMetrics metrics={metrics} totalCalendarDays={totalCalendarDays} viewMode={viewMode} />
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mt-4">
              <SecondaryMetrics metrics={metrics} dailyCosts={filteredData.map(d => d.totalCost)} viewMode={viewMode} />
            </div>
          </FadeIn>
        </div>

        {/* Today's KPIs */}
        {todayData && (
          <div id="today">
            <TodayMetrics today={todayData} metrics={metrics} />
          </div>
        )}

        {/* Current Month KPIs */}
        {hasCurrentMonthData && (
          <div id="current-month">
            <MonthMetrics daily={filteredDailyData} metrics={metrics} />
          </div>
        )}

        {/* Heatmap Calendar */}
        <div id="activity">
          <SectionHeader title={t('dashboard.activity.title')} description={viewMode === 'daily' ? t('dashboard.activity.dailyDescription') : viewMode === 'monthly' ? t('dashboard.activity.monthlyDescription') : t('dashboard.activity.yearlyDescription')} info={SECTION_HELP.activity} />
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="cost" />
              <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="requests" />
              <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="tokens" />
            </div>
          </FadeIn>
        </div>

        {/* Cost Forecast + Cache ROI */}
        <div id="forecast-cache">
          <SectionHeader title={t('dashboard.forecastCache.title')} description={t('dashboard.forecastCache.description')} info={SECTION_HELP.forecastCache} />
          <FadeIn delay={0.25}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ExpandableCard title={t('dashboard.cards.costForecast')}>
                <CostForecast data={filteredData} viewMode={viewMode} />
              </ExpandableCard>
              <ExpandableCard title={t('dashboard.cards.cacheRoi')} stats={[
                { label: t('dashboard.stats.cacheHitRate'), value: formatPercent(metrics.cacheHitRate) },
                { label: t('dashboard.stats.totalTokens'), value: formatTokens(metrics.totalTokens) },
                { label: t('dashboard.stats.cacheRead'), value: formatTokens(metrics.totalCacheRead) },
              ]}>
                <CacheROI data={filteredData} viewMode={viewMode} />
              </ExpandableCard>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.27}>
          <ProviderLimitsSection
            data={filteredDailyData}
            providers={visibleLimitProviders}
            limits={providerLimits}
            selectedMonth={selectedMonth}
          />
        </FadeIn>

        {/* Charts */}
        <div id="charts">
          <SectionHeader title={t('dashboard.costAnalysis.title')} badge={`${allModels.length} ${t('common.models')}`} description={t('dashboard.costAnalysis.description')} info={SECTION_HELP.costAnalysis} />
          <FadeIn delay={0.3}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <CostOverTime data={costChartData} onClickDay={setDrillDownDate} />
              </div>
              <CostByModel data={modelPieData} />
            </div>
          </FadeIn>

          <FadeIn delay={0.35}>
            <div className="mt-4">
              <CostByModelOverTime data={modelCostChartData} models={allModels} />
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CumulativeCost data={costChartData} rawData={filteredData} />
              <CostByWeekday data={weekdayData} />
            </div>
          </FadeIn>

          <FadeIn delay={0.42}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <TokenEfficiency data={filteredData} />
              <ModelMix data={filteredData} />
            </div>
          </FadeIn>
        </div>

        {/* Token Analysis */}
        <div id="token-analysis">
          <SectionHeader title={t('dashboard.tokenAnalysis.title')} description={t('dashboard.tokenAnalysis.description')} info={SECTION_HELP.tokenAnalysis} />
          <FadeIn delay={0.45}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TokensOverTime data={tokenChartData} onClickDay={setDrillDownDate} />
              <TokenTypes data={tokenPieData} />
            </div>
          </FadeIn>
        </div>

        {metrics.hasRequestData && (
          <div id="request-analysis">
            <SectionHeader title={t('dashboard.requestAnalysis.title')} description={t('dashboard.requestAnalysis.description')} info={SECTION_HELP.requestAnalysis} />
            <FadeIn delay={0.47}>
              <RequestsOverTime data={requestChartData} viewMode={viewMode} onClickDay={setDrillDownDate} />
            </FadeIn>
            <FadeIn delay={0.49}>
              <div className="mt-4">
                <RequestCacheHitRateByModel timelineData={filteredData} summaryData={filteredDailyData} viewMode={viewMode} />
              </div>
            </FadeIn>
            <FadeIn delay={0.51}>
              <div className="mt-4">
                <RequestQuality metrics={metrics} viewMode={viewMode} />
              </div>
            </FadeIn>
          </div>
        )}

        <div id="advanced-analysis">
          <SectionHeader title={t('dashboard.advancedAnalysis.title')} description={t('dashboard.advancedAnalysis.description')} info={SECTION_HELP.advancedAnalysis} />
          <FadeIn delay={0.48}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <DistributionAnalysis data={filteredData} viewMode={viewMode} />
              <ConcentrationRisk
                topModelShare={metrics.topModelShare}
                topProviderShare={metrics.topProvider?.share ?? 0}
                modelConcentrationIndex={metrics.modelConcentrationIndex}
                providerConcentrationIndex={metrics.providerConcentrationIndex}
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.5}>
            <div className="mt-4">
              <CorrelationAnalysis data={filteredData} />
            </div>
          </FadeIn>
        </div>

        {/* Period Comparison + Anomaly Detection */}
        <div id="comparisons">
          <SectionHeader title={t('dashboard.comparisons.title')} description={t('dashboard.comparisons.description')} info={SECTION_HELP.comparisons} />
          <FadeIn delay={0.5}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ExpandableCard title={t('dashboard.cards.periodComparison')} stats={[
                { label: t('dashboard.stats.dataPoints'), value: String(filteredData.length) },
                { label: t('dashboard.stats.avgCostPerUnit', { unit: periodUnit(viewMode) }), value: formatCurrency(metrics.avgDailyCost) },
              ]}>
                <PeriodComparison data={comparisonData} />
              </ExpandableCard>
              <ExpandableCard title={t('dashboard.cards.anomalyDetection')} stats={[
                { label: t('dashboard.stats.total'), value: formatCurrency(metrics.totalCost) },
                { label: t('dashboard.stats.avgPerUnit', { unit: periodUnit(viewMode) }), value: formatCurrency(metrics.avgDailyCost) },
              ]}>
                <AnomalyDetection data={filteredData} onClickDay={setDrillDownDate} viewMode={viewMode} />
              </ExpandableCard>
            </div>
          </FadeIn>
        </div>

        {/* Tables */}
        <div id="tables">
          <SectionHeader title={t('dashboard.tables.title')} description={t('dashboard.tables.description')} info={SECTION_HELP.tables} />
          <FadeIn delay={0.55}>
            <ModelEfficiency modelCosts={modelCosts} totalCost={metrics.totalCost} viewMode={viewMode} />
          </FadeIn>
          <FadeIn delay={0.6}>
            <div className="mt-4">
              <ProviderEfficiency providerMetrics={providerMetrics} totalCost={metrics.totalCost} viewMode={viewMode} />
            </div>
          </FadeIn>
          <FadeIn delay={0.65}>
            <div className="mt-4">
              <RecentDays data={filteredData} onClickDay={setDrillDownDate} viewMode={viewMode} />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Drill-Down Modal */}
      <Suspense fallback={null}>
        {drillDownDate !== null && (
          <DrillDownModal
            day={drillDownDay}
            contextData={filteredData}
            open={drillDownDate !== null}
            onClose={() => setDrillDownDate(null)}
          />
        )}
      </Suspense>

      {/* Command Palette */}
      <CommandPalette
        isDark={isDark}
        currentLanguage={settings.language}
        availableProviders={availableProviders}
        selectedProviders={selectedProviders}
        availableModels={availableModels}
        selectedModels={selectedModels}
        hasTodaySection={Boolean(todayData)}
        hasMonthSection={hasCurrentMonthData}
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

      <Suspense fallback={null}>
        {autoImportOpen && <AutoImportModal open={autoImportOpen} onOpenChange={setAutoImportOpen} onSuccess={handleAutoImportSuccess} />}
      </Suspense>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        providers={allProviders}
        limits={providerLimits}
        lastLoadedAt={settings.lastLoadedAt}
        lastLoadSource={settings.lastLoadSource}
        cliAutoLoadActive={settings.cliAutoLoadActive}
        hasData={hasData}
        onSaveLimits={setProviderLimits}
        onExportSettings={handleExportSettings}
        onImportSettings={handleImportSettings}
        onExportData={handleExportData}
        onImportData={handleImportData}
        settingsBusy={settingsTransferBusy || isSaving}
        dataBusy={dataTransferBusy}
      />
    </div>
  )
}
