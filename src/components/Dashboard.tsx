import { useRef, useState, useCallback, useMemo } from 'react'
import { Header } from './layout/Header'
import { FilterBar } from './layout/FilterBar'
import { PrimaryMetrics } from './cards/PrimaryMetrics'
import { SecondaryMetrics } from './cards/SecondaryMetrics'
import { CostOverTime } from './charts/CostOverTime'
import { CostByModel } from './charts/CostByModel'
import { CostByModelOverTime } from './charts/CostByModelOverTime'
import { CumulativeCost } from './charts/CumulativeCost'
import { TokensOverTime } from './charts/TokensOverTime'
import { TokenTypes } from './charts/TokenTypes'
import { CostByWeekday } from './charts/CostByWeekday'
import { ModelEfficiency } from './tables/ModelEfficiency'
import { RecentDays } from './tables/RecentDays'
import { EmptyState } from './EmptyState'
import { HeatmapCalendar } from './features/heatmap/HeatmapCalendar'
import { CostForecast } from './features/forecast/CostForecast'
import { CacheROI } from './features/cache-roi/CacheROI'
import { PeriodComparison } from './features/comparison/PeriodComparison'
import { AnomalyDetection } from './features/anomaly/AnomalyDetection'
import { DrillDownModal } from './features/drill-down/DrillDownModal'
import { PDFReportButton } from './features/pdf-report/PDFReport'
import { CommandPalette } from './features/command-palette/CommandPalette'
import { FadeIn } from './features/animations/FadeIn'
import { useUsageData, useUploadData, useDeleteData } from '@/hooks/use-usage-data'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useTheme } from '@/hooks/use-theme'
import { useToast } from '@/components/ui/toast'
import { downloadCSV } from '@/lib/csv-export'
import type { UsageData } from '@/types'

export function Dashboard() {
  const { data: usageData, isLoading } = useUsageData()
  const uploadMutation = useUploadData()
  const deleteMutation = useDeleteData()
  const { isDark, toggle: toggleTheme } = useTheme()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null)

  const daily = usageData?.daily ?? []
  const hasData = daily.length > 0

  const {
    viewMode, setViewMode,
    selectedMonth, setSelectedMonth,
    selectedModels, toggleModel,
    filteredData,
    availableMonths,
    dateRange,
  } = useDashboardFilters(daily)

  const {
    metrics, modelCosts, costChartData, modelCostChartData,
    tokenChartData, weekdayData, allModels, modelPieData, tokenPieData,
  } = useComputedMetrics(filteredData)

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
      const json = JSON.parse(text) as UsageData
      if (!json.daily || !Array.isArray(json.daily)) {
        addToast("Die JSON-Datei muss ein 'daily' Array enthalten", 'error')
        return
      }
      await uploadMutation.mutateAsync(json)
      addToast(`${json.daily.length} Tage erfolgreich geladen`, 'success')
    } catch {
      addToast('Datei konnte nicht gelesen werden', 'error')
    }
    e.target.value = ''
  }, [uploadMutation, addToast])

  const handleDelete = useCallback(async () => {
    await deleteMutation.mutateAsync()
    addToast('Daten gelöscht', 'info')
  }, [deleteMutation, addToast])

  const handleExportCSV = useCallback(() => {
    downloadCSV(filteredData)
    addToast('CSV exportiert', 'success')
  }, [filteredData, addToast])

  const handleScrollTo = useCallback((section: string) => {
    const el = document.getElementById(section)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <>
        <EmptyState onUpload={handleUpload} />
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </>
    )
  }

  return (
    <div ref={dashboardRef} className="min-h-screen max-w-7xl mx-auto px-4 pb-8">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

      <Header
        dateRange={dateRange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onExportCSV={handleExportCSV}
        onDelete={handleDelete}
        onUpload={handleUpload}
        pdfButton={<PDFReportButton containerRef={dashboardRef} />}
      />

      <FilterBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        allModels={allModels}
        selectedModels={selectedModels}
        onToggleModel={toggleModel}
      />

      <div className="space-y-4 mt-4">
        {/* Primary Metrics with animations */}
        <div id="metrics">
          <FadeIn delay={0}>
            <PrimaryMetrics metrics={metrics} />
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mt-4">
              <SecondaryMetrics metrics={metrics} />
            </div>
          </FadeIn>
        </div>

        {/* Heatmap Calendar */}
        <FadeIn delay={0.2}>
          <HeatmapCalendar data={filteredData} />
        </FadeIn>

        {/* Cost Forecast + Cache ROI */}
        <FadeIn delay={0.25}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CostForecast data={filteredData} />
            <CacheROI data={filteredData} />
          </div>
        </FadeIn>

        {/* Charts */}
        <div id="charts">
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
              <CumulativeCost data={costChartData} />
              <CostByWeekday data={weekdayData} />
            </div>
          </FadeIn>

          <FadeIn delay={0.45}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <TokensOverTime data={tokenChartData} />
              <TokenTypes data={tokenPieData} />
            </div>
          </FadeIn>
        </div>

        {/* Period Comparison + Anomaly Detection */}
        <FadeIn delay={0.5}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PeriodComparison data={filteredData} />
            <AnomalyDetection data={filteredData} onClickDay={setDrillDownDate} />
          </div>
        </FadeIn>

        {/* Tables */}
        <div id="tables">
          <FadeIn delay={0.55}>
            <ModelEfficiency modelCosts={modelCosts} totalCost={metrics.totalCost} />
          </FadeIn>
          <FadeIn delay={0.6}>
            <div className="mt-4">
              <RecentDays data={filteredData} onClickDay={setDrillDownDate} />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        day={drillDownDay}
        open={drillDownDate !== null}
        onClose={() => setDrillDownDate(null)}
      />

      {/* Command Palette */}
      <CommandPalette
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onExportCSV={handleExportCSV}
        onDelete={handleDelete}
        onUpload={handleUpload}
        onScrollTo={handleScrollTo}
      />
    </div>
  )
}
