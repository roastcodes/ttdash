import { useState, useCallback, useMemo } from 'react'
import type { DailyUsage, ViewMode } from '@/types'
import { filterByModels, filterByMonth, sortByDate, getAvailableMonths, getDateRange } from '@/lib/data-transforms'

export function useDashboardFilters(data: DailyUsage[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const toggleModel = useCallback((model: string) => {
    setSelectedModels(prev =>
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    )
  }, [])

  const clearModels = useCallback(() => setSelectedModels([]), [])

  const filteredData = useMemo(() => {
    let result = sortByDate(data)
    result = filterByMonth(result, selectedMonth)
    result = filterByModels(result, selectedModels)
    return result
  }, [data, selectedMonth, selectedModels])

  const availableMonths = useMemo(() => getAvailableMonths(data), [data])
  const dateRange = useMemo(() => getDateRange(filteredData), [filteredData])

  return {
    viewMode, setViewMode,
    selectedMonth, setSelectedMonth,
    selectedModels, toggleModel, clearModels,
    filteredData,
    availableMonths,
    dateRange,
  }
}
