import { useMemo } from 'react'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { computeDashboardForecastState } from '@/lib/calculations'
import { getCurrentMonthForecastData } from '@/lib/data-transforms'
import { localToday, toLocalDateStr } from '@/lib/formatters'
import type { AppSettings, DailyUsage } from '@/types'

/** Collects the heavy derived data assembled for the dashboard controller. */
export interface DashboardControllerDerivedState {
  hasData: boolean
  filters: ReturnType<typeof useDashboardFilters>
  computed: ReturnType<typeof useComputedMetrics>
  totalCalendarDays: number
  todayData: DailyUsage | null
  hasCurrentMonthData: boolean
  visibleLimitProviders: string[]
  forecastState: ReturnType<typeof computeDashboardForecastState>
  settingsProviderOptions: string[]
  settingsModelOptions: string[]
  streak: number
  filterBarModels: string[]
}

/** Declares the raw inputs required to derive the dashboard controller state. */
interface DashboardControllerDerivedStateParams {
  daily: DailyUsage[]
  hasData: boolean
  allProviders: string[]
  allModelsFromData: string[]
  settings: AppSettings
  locale: string
}

/** Composes the dashboard's heavy derived data from usage, settings, filters, and metrics hooks. */
export function useDashboardControllerDerivedState({
  daily,
  hasData,
  allProviders,
  allModelsFromData,
  settings,
  locale,
}: DashboardControllerDerivedStateParams): DashboardControllerDerivedState {
  const filters = useDashboardFilters(daily, settings.defaultFilters)
  const computed = useComputedMetrics(filters.filteredData, locale)

  const totalCalendarDays = useMemo(() => {
    if (!filters.dateRange || filters.viewMode !== 'daily') return 0

    const start = new Date(filters.dateRange.start + 'T00:00:00')
    const end = new Date(filters.dateRange.end + 'T00:00:00')
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [filters.dateRange, filters.viewMode])

  const todayStr = localToday()

  const todayData = useMemo(
    () => filters.filteredDailyData.find((entry) => entry.date === todayStr) ?? null,
    [filters.filteredDailyData, todayStr],
  )

  const hasCurrentMonthData = useMemo(
    () => filters.filteredDailyData.some((entry) => entry.date.startsWith(todayStr.slice(0, 7))),
    [filters.filteredDailyData, todayStr],
  )

  const visibleLimitProviders = useMemo(
    () => (filters.selectedProviders.length > 0 ? filters.selectedProviders : allProviders),
    [filters.selectedProviders, allProviders],
  )

  const forecastData = useMemo(
    () => getCurrentMonthForecastData(daily, filters.selectedProviders, filters.selectedModels),
    [daily, filters.selectedProviders, filters.selectedModels],
  )

  const forecastState = useMemo(() => computeDashboardForecastState(forecastData), [forecastData])

  const settingsProviderOptions = useMemo(
    () =>
      [...new Set([...allProviders, ...settings.defaultFilters.providers])].sort((left, right) =>
        left.localeCompare(right),
      ),
    [allProviders, settings.defaultFilters.providers],
  )

  const settingsModelOptions = useMemo(
    () =>
      [...new Set([...allModelsFromData, ...settings.defaultFilters.models])].sort((left, right) =>
        left.localeCompare(right),
      ),
    [allModelsFromData, settings.defaultFilters.models],
  )

  const streak = useMemo(() => {
    const dates = new Set(filters.filteredDailyData.map((entry) => entry.date))
    let count = 0
    const date = new Date(todayStr + 'T00:00:00')

    while (dates.has(toLocalDateStr(date))) {
      count += 1
      date.setDate(date.getDate() - 1)
    }

    return count
  }, [filters.filteredDailyData, todayStr])

  const filterBarModels = useMemo(
    () => Array.from(new Set([...filters.availableModels, ...filters.selectedModels])),
    [filters.availableModels, filters.selectedModels],
  )

  return {
    hasData,
    filters,
    computed,
    totalCalendarDays,
    todayData,
    hasCurrentMonthData,
    visibleLimitProviders,
    forecastState,
    settingsProviderOptions,
    settingsModelOptions,
    streak,
    filterBarModels,
  }
}
