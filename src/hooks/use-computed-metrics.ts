import { useMemo } from 'react'
import type { DailyUsage } from '@/types'
import { computeMetrics, computeModelCosts, computeProviderMetrics } from '@/lib/calculations'
import {
  toCostChartData,
  toModelCostChartData,
  toTokenChartData,
  toRequestChartData,
  toWeekdayData,
} from '@/lib/data-transforms'
import { getUniqueModels } from '@/lib/model-utils'

export function useComputedMetrics(data: DailyUsage[]) {
  const metrics = useMemo(() => computeMetrics(data), [data])
  const modelCosts = useMemo(() => computeModelCosts(data), [data])
  const providerMetrics = useMemo(() => computeProviderMetrics(data), [data])
  const costChartData = useMemo(() => toCostChartData(data), [data])
  const modelCostChartData = useMemo(() => toModelCostChartData(data), [data])
  const tokenChartData = useMemo(() => toTokenChartData(data), [data])
  const requestChartData = useMemo(() => toRequestChartData(data), [data])
  const weekdayData = useMemo(() => toWeekdayData(data), [data])
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
    costChartData,
    modelCostChartData,
    tokenChartData,
    requestChartData,
    weekdayData,
    allModels,
    modelPieData,
    tokenPieData,
  }
}
