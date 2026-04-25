import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { DailyUsage, DashboardDefaultFilters, DashboardDatePreset, ViewMode } from '@/types'
import { DEFAULT_DASHBOARD_FILTERS, resolveDashboardPresetRange } from '@/lib/dashboard-preferences'
import {
  deriveDashboardFilterData,
  sanitizeDashboardDefaultFilters,
  sortDashboardUsageData,
} from '@/lib/dashboard-filter-data'

/** Manages dashboard filters and derives the filtered usage slices. */
export function useDashboardFilters(
  data: DailyUsage[],
  defaultFilters: DashboardDefaultFilters = DEFAULT_DASHBOARD_FILTERS,
) {
  const sortedData = useMemo(() => sortDashboardUsageData(data), [data])
  const resolvedDefaults = useMemo(
    () => sanitizeDashboardDefaultFilters(sortedData, defaultFilters),
    [sortedData, defaultFilters],
  )
  const defaultRange = useMemo(
    () => resolveDashboardPresetRange(resolvedDefaults.datePreset),
    [resolvedDefaults.datePreset],
  )
  const defaultFiltersKey = useMemo(() => JSON.stringify(resolvedDefaults), [resolvedDefaults])

  const [viewModeState, setViewModeState] = useState<ViewMode>(resolvedDefaults.viewMode)
  const [selectedMonthState, setSelectedMonthState] = useState<string | null>(null)
  const [selectedProvidersState, setSelectedProvidersState] = useState<string[]>(
    resolvedDefaults.providers,
  )
  const [selectedModelsState, setSelectedModelsState] = useState<string[]>(resolvedDefaults.models)
  const [startDateState, setStartDateState] = useState<string | undefined>(defaultRange.startDate)
  const [endDateState, setEndDateState] = useState<string | undefined>(defaultRange.endDate)
  const userModifiedRef = useRef(false)
  const appliedDefaultsKeyRef = useRef(defaultFiltersKey)

  const applyDefaultFilters = useCallback(
    (nextDefaultFilters: DashboardDefaultFilters = defaultFilters) => {
      const sanitizedDefaults = sanitizeDashboardDefaultFilters(sortedData, nextDefaultFilters)
      const nextRange = resolveDashboardPresetRange(sanitizedDefaults.datePreset)
      userModifiedRef.current = false
      appliedDefaultsKeyRef.current = JSON.stringify(sanitizedDefaults)
      setViewModeState(sanitizedDefaults.viewMode)
      setSelectedMonthState(null)
      setSelectedProvidersState(sanitizedDefaults.providers)
      setSelectedModelsState(sanitizedDefaults.models)
      setStartDateState(nextRange.startDate)
      setEndDateState(nextRange.endDate)
    },
    [defaultFilters, sortedData],
  )

  useEffect(() => {
    if (appliedDefaultsKeyRef.current === defaultFiltersKey || userModifiedRef.current) {
      return
    }

    appliedDefaultsKeyRef.current = defaultFiltersKey
    setViewModeState(resolvedDefaults.viewMode)
    setSelectedMonthState(null)
    setSelectedProvidersState(resolvedDefaults.providers)
    setSelectedModelsState(resolvedDefaults.models)
    setStartDateState(defaultRange.startDate)
    setEndDateState(defaultRange.endDate)
  }, [defaultFiltersKey, resolvedDefaults, defaultRange])

  const setViewMode = useCallback((mode: ViewMode) => {
    userModifiedRef.current = true
    setViewModeState(mode)
  }, [])

  const setSelectedMonth = useCallback((month: string | null) => {
    userModifiedRef.current = true
    setSelectedMonthState(month)
  }, [])

  const setStartDate = useCallback((date: string | undefined) => {
    userModifiedRef.current = true
    setStartDateState(date)
  }, [])

  const setEndDate = useCallback((date: string | undefined) => {
    userModifiedRef.current = true
    setEndDateState(date)
  }, [])

  const toggleProvider = useCallback((provider: string) => {
    userModifiedRef.current = true
    setSelectedProvidersState((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
    )
    setSelectedModelsState([])
  }, [])

  const clearProviders = useCallback(() => {
    userModifiedRef.current = true
    setSelectedProvidersState([])
    setSelectedModelsState([])
  }, [])

  const toggleModel = useCallback((model: string) => {
    userModifiedRef.current = true
    setSelectedModelsState((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    )
  }, [])

  const clearModels = useCallback(() => {
    userModifiedRef.current = true
    setSelectedModelsState([])
  }, [])

  const resetAll = useCallback(() => {
    applyDefaultFilters()
  }, [applyDefaultFilters])

  const applyPreset = useCallback((preset: DashboardDatePreset) => {
    userModifiedRef.current = true
    setSelectedMonthState(null)
    const nextRange = resolveDashboardPresetRange(preset)
    setStartDateState(nextRange.startDate)
    setEndDateState(nextRange.endDate)
  }, [])

  const filterData = useMemo(
    () =>
      deriveDashboardFilterData({
        sortedData,
        viewMode: viewModeState,
        selectedMonth: selectedMonthState,
        selectedProviders: selectedProvidersState,
        selectedModels: selectedModelsState,
        startDate: startDateState,
        endDate: endDateState,
      }),
    [
      sortedData,
      viewModeState,
      selectedMonthState,
      selectedProvidersState,
      selectedModelsState,
      startDateState,
      endDateState,
    ],
  )

  return {
    viewMode: viewModeState,
    setViewMode,
    selectedMonth: selectedMonthState,
    setSelectedMonth,
    selectedProviders: selectedProvidersState,
    toggleProvider,
    clearProviders,
    selectedModels: selectedModelsState,
    toggleModel,
    clearModels,
    startDate: startDateState,
    setStartDate,
    endDate: endDateState,
    setEndDate,
    resetAll,
    applyDefaultFilters,
    applyPreset,
    filteredDailyData: filterData.filteredDailyData,
    filteredData: filterData.filteredData,
    availableMonths: filterData.availableMonths,
    availableProviders: filterData.availableProviders,
    availableModels: filterData.availableModels,
    dateRange: filterData.dateRange,
  }
}
