import { useState, useCallback, useMemo } from 'react'
import type { DailyUsage, ViewMode } from '@/types'
import { filterByDateRange, filterByModels, filterByMonth, sortByDate, getAvailableMonths, getDateRange, aggregateToDailyFormat, filterByProviders } from '@/lib/data-transforms'
import { toLocalDateStr } from '@/lib/formatters'
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'

export function useDashboardFilters(data: DailyUsage[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  const toggleProvider = useCallback((provider: string) => {
    setSelectedProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    )
    setSelectedModels([])
  }, [])

  const clearProviders = useCallback(() => {
    setSelectedProviders([])
    setSelectedModels([])
  }, [])

  const toggleModel = useCallback((model: string) => {
    setSelectedModels(prev =>
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    )
  }, [])

  const clearModels = useCallback(() => setSelectedModels([]), [])

  const resetAll = useCallback(() => {
    setViewMode('daily')
    setSelectedMonth(null)
    setSelectedProviders([])
    setSelectedModels([])
    setStartDate(undefined)
    setEndDate(undefined)
  }, [])

  const applyPreset = useCallback((preset: string) => {
    setSelectedMonth(null)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fmt = toLocalDateStr

    switch (preset) {
      case '7d': {
        const start = new Date(today)
        start.setDate(today.getDate() - 6)
        setStartDate(fmt(start))
        setEndDate(fmt(today))
        break
      }
      case '30d': {
        const start = new Date(today)
        start.setDate(today.getDate() - 29)
        setStartDate(fmt(start))
        setEndDate(fmt(today))
        break
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        setStartDate(fmt(start))
        setEndDate(fmt(today))
        break
      }
      case 'year': {
        const start = new Date(today.getFullYear(), 0, 1)
        setStartDate(fmt(start))
        setEndDate(fmt(today))
        break
      }
      case 'all':
      default:
        setStartDate(undefined)
        setEndDate(undefined)
        break
    }
  }, [])

  const preProviderFilteredData = useMemo(() => {
    let result = sortByDate(data)
    result = filterByDateRange(result, startDate, endDate)
    result = filterByMonth(result, selectedMonth)
    return result
  }, [data, startDate, endDate, selectedMonth])

  const preModelFilteredData = useMemo(() => {
    let result = preProviderFilteredData
    result = filterByProviders(result, selectedProviders)
    return result
  }, [preProviderFilteredData, selectedProviders])

  const filteredDailyData = useMemo(() => {
    let result = preModelFilteredData
    result = filterByModels(result, selectedModels)
    return result
  }, [preModelFilteredData, selectedModels])

  const filteredData = useMemo(() => {
    let result = filteredDailyData
    result = aggregateToDailyFormat(result, viewMode)
    return result
  }, [filteredDailyData, viewMode])

  const availableMonths = useMemo(() => getAvailableMonths(data), [data])
  const availableProviders = useMemo(() => getUniqueProviders(preProviderFilteredData.map(d => d.modelsUsed)), [preProviderFilteredData])
  const availableModels = useMemo(() => getUniqueModels(preModelFilteredData.map(d => d.modelsUsed)), [preModelFilteredData])
  const dateRange = useMemo(() => getDateRange(filteredDailyData), [filteredDailyData])

  return {
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
  }
}
