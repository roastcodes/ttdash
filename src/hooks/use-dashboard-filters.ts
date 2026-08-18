import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type {
  DailyUsage,
  DashboardDefaultFilters,
  DashboardDatePreset,
  UsageSystem,
  ViewMode,
} from '@/types'
import { DEFAULT_DASHBOARD_FILTERS, resolveDashboardPresetRange } from '@/lib/dashboard-preferences'
import {
  deriveDashboardFilterData,
  mergeSystemUsageByDate,
  sanitizeDashboardDefaultFilters,
  sortDashboardUsageData,
} from '@/lib/dashboard-filter-data'

const EMPTY_SYSTEMS: UsageSystem[] = []

/** Manages dashboard filters and derives the filtered usage slices. */
export function useDashboardFilters(
  data: DailyUsage[],
  systems: UsageSystem[] = EMPTY_SYSTEMS,
  defaultFilters: DashboardDefaultFilters = DEFAULT_DASHBOARD_FILTERS,
) {
  const availableSystems = useMemo(
    () =>
      systems.map((system) => ({
        id: system.id,
        hostname: system.hostname,
        isLocal: system.isLocal,
      })),
    [systems],
  )
  const validSystemIds = useMemo(() => new Set(systems.map((system) => system.id)), [systems])
  const defaultSystems = useMemo(
    () => defaultFilters.systems.filter((system) => validSystemIds.has(system)),
    [defaultFilters.systems, validSystemIds],
  )
  const [selectedSystemsState, setSelectedSystemsState] = useState<string[]>(defaultSystems)
  const systemFilteredData = useMemo(() => {
    if (systems.length === 0) return data
    const selected = new Set(selectedSystemsState)
    return mergeSystemUsageByDate(
      selected.size > 0 ? systems.filter((system) => selected.has(system.id)) : systems,
    )
  }, [data, systems, selectedSystemsState])
  const sortedData = useMemo(() => sortDashboardUsageData(systemFilteredData), [systemFilteredData])
  const resolvedDefaults = useMemo(
    () => ({
      ...sanitizeDashboardDefaultFilters(sortedData, defaultFilters),
      systems: defaultSystems,
    }),
    [sortedData, defaultFilters, defaultSystems],
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
      const nextSystems = sanitizedDefaults.systems.filter((system) => validSystemIds.has(system))
      const appliedDefaults = { ...sanitizedDefaults, systems: nextSystems }
      const nextRange = resolveDashboardPresetRange(sanitizedDefaults.datePreset)
      userModifiedRef.current = false
      appliedDefaultsKeyRef.current = JSON.stringify(appliedDefaults)
      setViewModeState(sanitizedDefaults.viewMode)
      setSelectedMonthState(null)
      setSelectedProvidersState(sanitizedDefaults.providers)
      setSelectedModelsState(sanitizedDefaults.models)
      setSelectedSystemsState(nextSystems)
      setStartDateState(nextRange.startDate)
      setEndDateState(nextRange.endDate)
    },
    [defaultFilters, sortedData, validSystemIds],
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
    setSelectedSystemsState(resolvedDefaults.systems)
    setStartDateState(defaultRange.startDate)
    setEndDateState(defaultRange.endDate)
  }, [defaultFiltersKey, resolvedDefaults, defaultRange])

  useEffect(() => {
    setSelectedSystemsState((previous) => {
      const next = previous.filter((system) => validSystemIds.has(system))
      return next.length === previous.length ? previous : next
    })
  }, [validSystemIds])

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

  const toggleSystem = useCallback((system: string) => {
    userModifiedRef.current = true
    setSelectedSystemsState((previous) =>
      previous.includes(system)
        ? previous.filter((value) => value !== system)
        : [...previous, system],
    )
  }, [])

  const clearSystems = useCallback(() => {
    userModifiedRef.current = true
    setSelectedSystemsState([])
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
    availableSystems,
    selectedSystems: selectedSystemsState,
    toggleSystem,
    clearSystems,
    startDate: startDateState,
    setStartDate,
    endDate: endDateState,
    setEndDate,
    resetAll,
    applyDefaultFilters,
    applyPreset,
    systemDailyData: systemFilteredData,
    filteredDailyData: filterData.filteredDailyData,
    filteredData: filterData.filteredData,
    availableMonths: filterData.availableMonths,
    availableProviders: filterData.availableProviders,
    availableModels: filterData.availableModels,
    dateRange: filterData.dateRange,
  }
}
