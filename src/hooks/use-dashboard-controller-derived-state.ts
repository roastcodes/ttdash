import { useMemo } from 'react'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { computeDashboardForecastState } from '@/lib/calculations'
import {
  filterByModels,
  filterByProviders,
  getCurrentMonthForecastData,
} from '@/lib/data-transforms'
import { useLocalDay } from '@/hooks/use-local-day'
import { calendarDay, hasUsageActivity } from '../../shared/usage-quality.js'
import { toLocalDateStr } from '@/lib/formatters'
import type { DashboardControllerDerivedState } from '@/types/dashboard-controller'
import type { AppSettings, DailyUsage, UsageSystem } from '@/types'

/** Declares the raw inputs required to derive the dashboard controller state. */
interface DashboardControllerDerivedStateParams {
  daily: DailyUsage[]
  hasData: boolean
  allProviders: string[]
  allModelsFromData: string[]
  settings: AppSettings
  locale: string
  systems: UsageSystem[]
}

/** Composes the dashboard's heavy derived data from usage, settings, filters, and metrics hooks. */
export function useDashboardControllerDerivedState({
  daily,
  hasData,
  allProviders,
  allModelsFromData,
  settings,
  locale,
  systems,
}: DashboardControllerDerivedStateParams): DashboardControllerDerivedState {
  const filters = useDashboardFilters(daily, systems, settings.defaultFilters)
  const computed = useComputedMetrics(filters.filteredData, locale)
  // Forecast and anomaly detection need the per-day cost series, not aggregate cost metrics.
  const dailyCosts = useMemo(
    () => filters.filteredData.map((entry) => entry.totalCost),
    [filters.filteredData],
  )

  const totalCalendarDays = useMemo(() => {
    if (!filters.dateRange || filters.viewMode !== 'daily') return 0

    return calendarDay(filters.dateRange.end)! - calendarDay(filters.dateRange.start)! + 1
  }, [filters.dateRange, filters.viewMode])

  const todayStr = useLocalDay()
  const entityDailyData = useMemo(
    () =>
      filterByModels(
        filterByProviders(filters.systemDailyData, filters.selectedProviders),
        filters.selectedModels,
      ),
    [filters.systemDailyData, filters.selectedProviders, filters.selectedModels],
  )
  const comparisonEndDate =
    filters.endDate ??
    (filters.selectedMonth
      ? filters.selectedMonth === todayStr.slice(0, 7)
        ? todayStr
        : `${filters.selectedMonth}-${new Date(Number(filters.selectedMonth.slice(0, 4)), Number(filters.selectedMonth.slice(5, 7)), 0).getDate()}`
      : (filters.dateRange?.end ?? todayStr))

  const todayData = useMemo(
    () => entityDailyData.find((entry) => entry.date === todayStr) ?? null,
    [entityDailyData, todayStr],
  )

  const hasCurrentMonthData = useMemo(
    () => entityDailyData.some((entry) => entry.date.startsWith(todayStr.slice(0, 7))),
    [entityDailyData, todayStr],
  )

  const visibleLimitProviders = useMemo(
    () => (filters.selectedProviders.length > 0 ? filters.selectedProviders : allProviders),
    [filters.selectedProviders, allProviders],
  )

  const forecastData = useMemo(
    () =>
      getCurrentMonthForecastData(
        filters.systemDailyData,
        filters.selectedProviders,
        filters.selectedModels,
        todayStr,
      ),
    [filters.systemDailyData, filters.selectedProviders, filters.selectedModels, todayStr],
  )

  const forecastState = useMemo(
    () => computeDashboardForecastState(forecastData, todayStr),
    [forecastData, todayStr],
  )

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
    const dates = new Set(entityDailyData.filter(hasUsageActivity).map((entry) => entry.date))
    let count = 0
    const date = new Date(todayStr + 'T00:00:00')

    while (dates.has(toLocalDateStr(date))) {
      count += 1
      date.setDate(date.getDate() - 1)
    }

    return count
  }, [entityDailyData, todayStr])

  const filterBarModels = useMemo(
    () => Array.from(new Set([...filters.availableModels, ...filters.selectedModels])),
    [filters.availableModels, filters.selectedModels],
  )

  return {
    hasData,
    filters,
    computed,
    entityDailyData,
    comparisonEndDate,
    todayStr,
    dailyCosts,
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
