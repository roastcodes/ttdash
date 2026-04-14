import { useMemo } from 'react'
import type { DailyUsage } from '@/types'
import { computeMetrics, computeModelCosts, computeProviderMetrics } from '@/lib/calculations'
import { buildDashboardChartTransforms } from '@/lib/data-transforms'
import { getUniqueModels } from '@/lib/model-utils'

/** Builds memoized dashboard metrics, chart data, and model summaries. */
export function useComputedMetrics(data: DailyUsage[], locale: string) {
  const metrics = useMemo(() => computeMetrics(data), [data])
  const modelCosts = useMemo(() => computeModelCosts(data), [data])
  const providerMetrics = useMemo(() => computeProviderMetrics(data), [data])
  const chartTransforms = useMemo(() => buildDashboardChartTransforms(data, locale), [data, locale])
  const allModels = useMemo(() => getUniqueModels(data.map((d) => d.modelsUsed)), [data])

  const modelPieData = useMemo(() => {
    return Array.from(modelCosts.entries())
      .map(([name, v]) => ({ name, value: v.cost }))
      .sort((a, b) => b.value - a.value)
  }, [modelCosts])

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
    modelCosts,
    providerMetrics,
    costChartData: chartTransforms.costChartData,
    modelCostChartData: chartTransforms.modelCostChartData,
    tokenChartData: chartTransforms.tokenChartData,
    requestChartData: chartTransforms.requestChartData,
    weekdayData: chartTransforms.weekdayData,
    allModels,
    modelPieData,
    tokenPieData,
  }
}
