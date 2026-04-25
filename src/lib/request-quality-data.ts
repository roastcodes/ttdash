import type { DashboardMetrics, ViewMode } from '@/types'

/** Identifies a request-quality metric card. */
export type RequestQualityMetricId =
  | 'tokensPerRequest'
  | 'costPerRequest'
  | 'cachePerRequest'
  | 'thinkingPerRequest'

/** Identifies a request-quality summary tile. */
export type RequestQualitySummaryId =
  | 'requestDensity'
  | 'cacheHitRate'
  | 'inputOutput'
  | 'topRequestModel'

/** Describes one derived request-quality metric before localization. */
export type RequestQualityMetricData = {
  id: RequestQualityMetricId
  value: number
  accent: string
  progress: number
}

/** Describes one derived request-quality summary value before localization. */
export type RequestQualitySummaryData = {
  id: RequestQualitySummaryId
  value: number
}

/** Groups all non-presentational values needed by the request-quality view. */
export type RequestQualityData = {
  cachePerRequest: number
  thinkingPerRequest: number
  inputOutputRatio: number
  requestDensity: number
  averageUnit: 'day' | 'month' | 'year'
  qualityMetrics: RequestQualityMetricData[]
  summaryMetrics: RequestQualitySummaryData[]
}

/** Maps the dashboard aggregation mode to the matching period unit label key. */
export function resolveRequestQualityAverageUnit(viewMode: ViewMode): 'day' | 'month' | 'year' {
  if (viewMode === 'yearly') return 'year'
  if (viewMode === 'monthly') return 'month'
  return 'day'
}

/** Derives request-quality ratios, progress values, and summary values in one pass. */
export function deriveRequestQualityData(
  metrics: DashboardMetrics,
  viewMode: ViewMode,
): RequestQualityData {
  const cachePerRequest =
    metrics.totalRequests > 0 ? metrics.totalCacheRead / metrics.totalRequests : 0
  const thinkingPerRequest =
    metrics.totalRequests > 0 ? metrics.totalThinking / metrics.totalRequests : 0
  const inputOutputRatio = metrics.totalOutput > 0 ? metrics.totalInput / metrics.totalOutput : 0
  const requestDensity = metrics.activeDays > 0 ? metrics.totalRequests / metrics.activeDays : 0

  return {
    cachePerRequest,
    thinkingPerRequest,
    inputOutputRatio,
    requestDensity,
    averageUnit: resolveRequestQualityAverageUnit(viewMode),
    qualityMetrics: [
      {
        id: 'tokensPerRequest',
        value: metrics.avgTokensPerRequest,
        accent: 'var(--chart-2)',
        progress: Math.min(metrics.avgTokensPerRequest / 200_000, 1),
      },
      {
        id: 'costPerRequest',
        value: metrics.avgCostPerRequest,
        accent: 'var(--chart-4)',
        progress: Math.min(metrics.avgCostPerRequest / 0.25, 1),
      },
      {
        id: 'cachePerRequest',
        value: cachePerRequest,
        accent: 'var(--chart-1)',
        progress: Math.min(cachePerRequest / 200_000, 1),
      },
      {
        id: 'thinkingPerRequest',
        value: thinkingPerRequest,
        accent: 'var(--chart-5)',
        progress: Math.min(thinkingPerRequest / 10_000, 1),
      },
    ],
    summaryMetrics: [
      { id: 'requestDensity', value: requestDensity },
      { id: 'cacheHitRate', value: metrics.cacheHitRate },
      { id: 'inputOutput', value: inputOutputRatio },
      { id: 'topRequestModel', value: metrics.topRequestModel?.requests ?? 0 },
    ],
  }
}
