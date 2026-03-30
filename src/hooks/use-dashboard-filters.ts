import { useState, useCallback, useMemo } from 'react'
import type { DailyUsage, ViewMode } from '@/types'
import { filterByDateRange, filterByModels, filterByMonth, sortByDate, getAvailableMonths, getDateRange, aggregateToDailyFormat } from '@/lib/data-transforms'

export function useDashboardFilters(data: DailyUsage[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  const toggleModel = useCallback((model: string) => {
    setSelectedModels(prev =>
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    )
  }, [])

  const clearModels = useCallback(() => setSelectedModels([]), [])

  const applyPreset = useCallback((preset: string) => {
    setSelectedMonth(null)
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

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

  const filteredData = useMemo(() => {
    let result = sortByDate(data)
    result = filterByDateRange(result, startDate, endDate)
    result = filterByMonth(result, selectedMonth)
    result = filterByModels(result, selectedModels)
    result = aggregateToDailyFormat(result, viewMode)
    return result
  }, [data, startDate, endDate, selectedMonth, selectedModels, viewMode])

  const availableMonths = useMemo(() => getAvailableMonths(data), [data])
  const dateRange = useMemo(() => getDateRange(filteredData), [filteredData])

  return {
    viewMode, setViewMode,
    selectedMonth, setSelectedMonth,
    selectedModels, toggleModel, clearModels,
    startDate, setStartDate,
    endDate, setEndDate,
    applyPreset,
    filteredData,
    availableMonths,
    dateRange,
  }
}
