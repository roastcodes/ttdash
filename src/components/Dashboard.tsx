import { lazy, Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { useUsageData, useUploadData, useDeleteData } from '@/hooks/use-usage-data'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useTheme } from '@/hooks/use-theme'
import { useToast } from '@/components/ui/toast'
import { downloadCSV } from '@/lib/csv-export'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, formatTokens, formatPercent, periodUnit, localToday, toLocalDateStr } from '@/lib/formatters'

const DrillDownModal = lazy(() => import('./features/drill-down/DrillDownModal').then(module => ({ default: module.DrillDownModal })))
const AutoImportModal = lazy(() => import('./features/auto-import/AutoImportModal').then(module => ({ default: module.AutoImportModal })))

export function Dashboard() {
  const { data: usageData, isLoading } = useUsageData()
  const uploadMutation = useUploadData()
  const deleteMutation = useDeleteData()
  const queryClient = useQueryClient()
  const { isDark, toggle: toggleTheme } = useTheme()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [autoImportOpen, setAutoImportOpen] = useState(false)
  const [dataSource, setDataSource] = useState<{ type: 'stored' | 'auto-import' | 'file'; label?: string; time?: string } | null>(null)
  const [animationSeed, setAnimationSeed] = useState(0)

  const daily = usageData?.daily ?? []
  const hasData = daily.length > 0

  const initialSourceSet = useRef(false)
  useEffect(() => {
    if (hasData && !initialSourceSet.current && !dataSource) {
      initialSourceSet.current = true
      setDataSource({ type: 'stored' })
    }
  }, [hasData, dataSource])

  const {
    viewMode, setViewMode,
    selectedMonth, setSelectedMonth,
    selectedProviders, toggleProvider, clearProviders,
    selectedModels, toggleModel, clearModels,
    startDate, setStartDate,
    endDate, setEndDate,
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

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await uploadMutation.mutateAsync(json)
      setAnimationSeed(prev => prev + 1)
      setDataSource({ type: 'file', label: file.name, time: new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) })
      addToast(`Datei ${file.name} erfolgreich geladen`, 'success')
    } catch {
      addToast('Datei konnte nicht gelesen werden', 'error')
    }
    e.target.value = ''
  }, [uploadMutation, addToast])

  const handleDelete = useCallback(async () => {
    await deleteMutation.mutateAsync()
    setAnimationSeed(prev => prev + 1)
    setDataSource(null)
    initialSourceSet.current = false
    addToast('Daten gelöscht', 'info')
  }, [deleteMutation, addToast])

  const handleExportCSV = useCallback(() => {
    downloadCSV(filteredData)
    addToast('CSV exportiert', 'success')
  }, [filteredData, addToast])

  const handleAutoImport = useCallback(() => {
    setAutoImportOpen(true)
  }, [])

  const handleAutoImportSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['usage'] })
    setAnimationSeed(prev => prev + 1)
    setDataSource({ type: 'auto-import', time: new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) })
    addToast('Daten erfolgreich importiert', 'success')
  }, [queryClient, addToast])

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
        <EmptyState onUpload={handleUpload} onAutoImport={handleAutoImport} />
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        <Suspense fallback={null}>
          {autoImportOpen && <AutoImportModal open={autoImportOpen} onOpenChange={setAutoImportOpen} onSuccess={handleAutoImportSuccess} />}
        </Suspense>
      </>
    )
  }

  return (
    <div ref={dashboardRef} className="min-h-screen max-w-7xl mx-auto px-4 pb-8">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      <Header
        dateRange={dateRange}
        isDark={isDark}
        helpOpen={helpOpen}
        streak={streak}
        dataSource={dataSource}
        onHelpOpenChange={setHelpOpen}
        onToggleTheme={toggleTheme}
        onExportCSV={handleExportCSV}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onAutoImport={handleAutoImport}
        pdfButton={<PDFReportButton containerRef={dashboardRef} />}
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
        />
      </div>

      <div key={`${animationSeed}-${daily.length}-${daily[daily.length - 1]?.date ?? 'empty'}-${Math.round(metrics.totalCost)}`} className="space-y-4 mt-4">
        <div id="insights">
          <UsageInsights metrics={metrics} viewMode={viewMode} totalCalendarDays={totalCalendarDays} />
        </div>

        {/* Primary Metrics */}
        <div id="metrics">
          <SectionHeader title="Metriken" badge="10 Kennzahlen" description="Wichtigste KPIs im Überblick" info={SECTION_HELP.metrics} />
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
          <SectionHeader title="Aktivität" description={viewMode === 'daily' ? 'Tägliche Nutzungsübersicht' : viewMode === 'monthly' ? 'Monatliche Nutzungsübersicht' : 'Jährliche Nutzungsübersicht'} info={SECTION_HELP.activity} />
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
          <SectionHeader title="Prognose & Cache" description="Kostenprognose und Cache-Effizienz" info={SECTION_HELP.forecastCache} />
          <FadeIn delay={0.25}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ExpandableCard title="Kostenprognose">
                <CostForecast data={filteredData} viewMode={viewMode} />
              </ExpandableCard>
              <ExpandableCard title="Cache ROI" stats={[
                { label: 'Cache-Hit-Rate', value: formatPercent(metrics.cacheHitRate) },
                { label: 'Gesamt-Tokens', value: formatTokens(metrics.totalTokens) },
                { label: 'Cache Read', value: formatTokens(metrics.totalCacheRead) },
              ]}>
                <CacheROI data={filteredData} viewMode={viewMode} />
              </ExpandableCard>
            </div>
          </FadeIn>
        </div>

        {/* Charts */}
        <div id="charts">
          <SectionHeader title="Kostenanalyse" badge={`${allModels.length} Modelle`} description="Detaillierte Kostenaufschlüsselung" info={SECTION_HELP.costAnalysis} />
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
          <SectionHeader title="Token-Analyse" description="Verbrauch nach Token-Typ" info={SECTION_HELP.tokenAnalysis} />
          <FadeIn delay={0.45}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TokensOverTime data={tokenChartData} onClickDay={setDrillDownDate} />
              <TokenTypes data={tokenPieData} />
            </div>
          </FadeIn>
        </div>

        {metrics.hasRequestData && (
          <div id="request-analysis">
            <SectionHeader title="Request-Analyse" description="Requests gesamt, pro Modell und im Verlauf" info={SECTION_HELP.requestAnalysis} />
            <FadeIn delay={0.47}>
              <RequestsOverTime data={requestChartData} viewMode={viewMode} onClickDay={setDrillDownDate} />
            </FadeIn>
            <FadeIn delay={0.49}>
              <div className="mt-4">
                <RequestQuality metrics={metrics} viewMode={viewMode} />
              </div>
            </FadeIn>
          </div>
        )}

        <div id="advanced-analysis">
          <SectionHeader title="Verteilungen & Risiko" description="Zusätzliche Signale zu Streuung, Korrelation und Abhängigkeiten" info={SECTION_HELP.advancedAnalysis} />
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
          <SectionHeader title="Vergleiche & Anomalien" description="Periodenvergleich und Ausreisser" info={SECTION_HELP.comparisons} />
          <FadeIn delay={0.5}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ExpandableCard title="Periodenvergleich" stats={[
                { label: 'Datenpunkte', value: String(filteredData.length) },
                { label: `Ø Kosten/${periodUnit(viewMode)}`, value: formatCurrency(metrics.avgDailyCost) },
              ]}>
                <PeriodComparison data={comparisonData} />
              </ExpandableCard>
              <ExpandableCard title="Anomalie-Erkennung" stats={[
                { label: 'Gesamt', value: formatCurrency(metrics.totalCost) },
                { label: `Ø / ${periodUnit(viewMode)}`, value: formatCurrency(metrics.avgDailyCost) },
              ]}>
                <AnomalyDetection data={filteredData} onClickDay={setDrillDownDate} viewMode={viewMode} />
              </ExpandableCard>
            </div>
          </FadeIn>
        </div>

        {/* Tables */}
        <div id="tables">
          <SectionHeader title="Tabellen" description="Detaillierte Aufschlüsselungen" info={SECTION_HELP.tables} />
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
        availableProviders={availableProviders}
        selectedProviders={selectedProviders}
        availableModels={availableModels}
        selectedModels={selectedModels}
        hasTodaySection={Boolean(todayData)}
        hasMonthSection={hasCurrentMonthData}
        onToggleTheme={toggleTheme}
        onExportCSV={handleExportCSV}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onAutoImport={handleAutoImport}
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
        onHelp={() => setHelpOpen(true)}
      />

      <Suspense fallback={null}>
        {autoImportOpen && <AutoImportModal open={autoImportOpen} onOpenChange={setAutoImportOpen} onSuccess={handleAutoImportSuccess} />}
      </Suspense>
    </div>
  )
}
