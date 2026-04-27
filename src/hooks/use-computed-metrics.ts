import { useMemo } from 'react'
import type { DailyUsage } from '@/types'
import { computeMetrics } from '@/lib/calculations'
import { summarizeUsageBreakdowns } from '@/lib/dashboard-aggregation'
import { buildDashboardChartTransforms } from '@/lib/data-transforms'

/** Builds memoized dashboard metrics, chart data, and model summaries. */
export function useComputedMetrics(data: DailyUsage[], locale: string) {
  const metrics = useMemo(() => computeMetrics(data), [data])
  const breakdownSummary = useMemo(() => summarizeUsageBreakdowns(data), [data])
  const chartTransforms = useMemo(() => buildDashboardChartTransforms(data, locale), [data, locale])

  const modelPieData = useMemo(() => {
    return Array.from(breakdownSummary.modelCosts.entries())
      .map(([name, v]) => ({ name, value: v.cost }))
      .sort((a, b) => b.value - a.value)
  }, [breakdownSummary.modelCosts])

  const tokenPieData = useMemo(
    () => [
      { name: 'Input', value: metrics.totalInput },
      { name: 'Output', value: metrics.totalOutput },
      { name: 'Cache Write', value: metrics.totalCacheCreate },
      { name: 'Cache Read', value: metrics.totalCacheRead },
      { name: 'Thinking', value: metrics.totalThinking },
    ],
    [metrics],
  )

  return {
    metrics,
    modelCosts: breakdownSummary.modelCosts,
    providerMetrics: breakdownSummary.providerMetrics,
    costChartData: chartTransforms.costChartData,
    modelCostChartData: chartTransforms.modelCostChartData,
    tokenChartData: chartTransforms.tokenChartData,
    requestChartData: chartTransforms.requestChartData,
    weekdayData: chartTransforms.weekdayData,
    allModels: breakdownSummary.allModels,
    modelPieData,
    tokenPieData,
  }
}
