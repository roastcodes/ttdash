import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DashboardDrillDownViewModel } from '@/types/dashboard-view-model'
import type { DailyUsage } from '@/types'

/** Groups the drill-down dialog state and section interaction callback. */
export interface DashboardControllerDrillDownState {
  dialog: DashboardDrillDownViewModel
  onDrillDownDateChange: (date: string | null) => void
}

/** Owns the dashboard drill-down date selection and previous/next navigation flow. */
export function useDashboardControllerDrillDown(
  filteredData: DailyUsage[],
): DashboardControllerDrillDownState {
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null)

  const drillDownDay = useMemo(() => {
    if (!drillDownDate) return null
    return filteredData.find((entry) => entry.date === drillDownDate) ?? null
  }, [drillDownDate, filteredData])

  useEffect(() => {
    if (drillDownDate !== null && drillDownDay === null) {
      setDrillDownDate(null)
    }
  }, [drillDownDate, drillDownDay])

  const drillDownSequence = useMemo(
    () => [...filteredData].sort((left, right) => left.date.localeCompare(right.date)),
    [filteredData],
  )

  const drillDownIndex = useMemo(
    () =>
      drillDownDate !== null
        ? drillDownSequence.findIndex((entry) => entry.date === drillDownDate)
        : -1,
    [drillDownDate, drillDownSequence],
  )

  const hasPreviousDrillDown = drillDownIndex > 0
  const hasNextDrillDown = drillDownIndex >= 0 && drillDownIndex < drillDownSequence.length - 1

  const handleDrillDownPrevious = useCallback(() => {
    if (!hasPreviousDrillDown) return
    setDrillDownDate(drillDownSequence[drillDownIndex - 1]?.date ?? null)
  }, [drillDownIndex, drillDownSequence, hasPreviousDrillDown])

  const handleDrillDownNext = useCallback(() => {
    if (!hasNextDrillDown) return
    setDrillDownDate(drillDownSequence[drillDownIndex + 1]?.date ?? null)
  }, [drillDownIndex, drillDownSequence, hasNextDrillDown])

  const handleDrillDownClose = useCallback(() => {
    setDrillDownDate(null)
  }, [])

  return {
    dialog: {
      day: drillDownDay,
      contextData: filteredData,
      open: drillDownDay !== null,
      hasPrevious: hasPreviousDrillDown,
      hasNext: hasNextDrillDown,
      currentIndex: drillDownIndex >= 0 ? drillDownIndex + 1 : 0,
      totalCount: drillDownSequence.length,
      onPrevious: handleDrillDownPrevious,
      onNext: handleDrillDownNext,
      onClose: handleDrillDownClose,
    },
    onDrillDownDateChange: setDrillDownDate,
  }
}
