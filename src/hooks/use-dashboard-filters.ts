import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { DailyUsage, DashboardDefaultFilters, DashboardDatePreset, ViewMode } from '@/types'
import { DEFAULT_DASHBOARD_FILTERS, resolveDashboardPresetRange } from '@/lib/dashboard-preferences'
import {
  filterByDateRange,
  filterByModels,
  filterByMonth,
  sortByDate,
  getAvailableMonths,
  getDateRange,
  aggregateToDailyFormat,
  filterByProviders,
} from '@/lib/data-transforms'
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'

function sanitizeDefaultFilters(data: DailyUsage[], defaultFilters: DashboardDefaultFilters) {
  const providers = new Set(getUniqueProviders(data.map((entry) => entry.modelsUsed)))
  const models = new Set(getUniqueModels(data.map((entry) => entry.modelsUsed)))

  return {
    viewMode: defaultFilters.viewMode,
    datePreset: defaultFilters.datePreset,
    providers: defaultFilters.providers.filter((provider) => providers.has(provider)),
    models: defaultFilters.models.filter((model) => models.has(model)),
  }
}

/** Manages dashboard filters and derives the filtered usage slices. */
export function useDashboardFilters(
  data: DailyUsage[],
  defaultFilters: DashboardDefaultFilters = DEFAULT_DASHBOARD_FILTERS,
) {
  const sortedData = useMemo(() => sortByDate(data), [data])
  const resolvedDefaults = useMemo(
    () => sanitizeDefaultFilters(sortedData, defaultFilters),
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
      const sanitizedDefaults = sanitizeDefaultFilters(sortedData, nextDefaultFilters)
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

  const preProviderFilteredData = useMemo(() => {
    let result = sortedData
    result = filterByDateRange(result, startDateState, endDateState)
    result = filterByMonth(result, selectedMonthState)
    return result
  }, [sortedData, startDateState, endDateState, selectedMonthState])

  const preModelFilteredData = useMemo(() => {
    let result = preProviderFilteredData
    result = filterByProviders(result, selectedProvidersState)
    return result
  }, [preProviderFilteredData, selectedProvidersState])

  const filteredDailyData = useMemo(() => {
    let result = preModelFilteredData
    result = filterByModels(result, selectedModelsState)
    return result
  }, [preModelFilteredData, selectedModelsState])

  const filteredData = useMemo(() => {
    let result = filteredDailyData
    result = aggregateToDailyFormat(result, viewModeState)
    return result
  }, [filteredDailyData, viewModeState])

  const availableMonths = useMemo(() => getAvailableMonths(sortedData), [sortedData])
  const availableProviders = useMemo(
    () => getUniqueProviders(preProviderFilteredData.map((d) => d.modelsUsed)),
    [preProviderFilteredData],
  )
  const availableModels = useMemo(
    () => getUniqueModels(preModelFilteredData.map((d) => d.modelsUsed)),
    [preModelFilteredData],
  )
  const dateRange = useMemo(() => getDateRange(filteredDailyData), [filteredDailyData])

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
    filteredDailyData,
    filteredData,
    availableMonths,
    availableProviders,
    availableModels,
    dateRange,
  }
}
