import type {
  AggregateMetrics,
  CacheHitRateByModelChartDataPoint,
  DailyUsage,
  DashboardMetrics,
} from '@/types'
import {
  computeMetrics as computeSharedMetrics,
  computeMovingAverage as computeSharedMovingAverage,
  computeWeekOverWeekChange as computeSharedWeekOverWeekChange,
} from '../../shared/dashboard-domain.js'
import { summarizeUsageBreakdowns } from './dashboard-aggregation'
import { getModelProvider, normalizeModelName } from './model-utils'

/** Computes the core dashboard metrics for a dataset. */
export function computeMetrics(data: DailyUsage[]): DashboardMetrics {
  return computeSharedMetrics(data)
}

/** Computes the relative week-over-week cost change. */
export function computeWeekOverWeekChange(data: DailyUsage[]): number | null {
  return computeSharedWeekOverWeekChange(data)
}

/** Computes a simple moving average over numeric values. */
export function computeMovingAverage(
  values: Array<number | undefined>,
  window = 7,
): (number | undefined)[] {
  return computeSharedMovingAverage(values, window)
}

/** Aggregates per-model cost and token metrics across the dataset. */
export function computeModelCosts(data: DailyUsage[]): Map<string, AggregateMetrics> {
  return summarizeUsageBreakdowns(data).modelCosts
}

/** Aggregates provider-level metrics across the dataset. */
export function computeProviderMetrics(data: DailyUsage[]): Map<string, AggregateMetrics> {
  return summarizeUsageBreakdowns(data).providerMetrics
}

function computeCacheHitRate(
  cacheRead: number,
  cacheCreate: number,
  input: number,
  output: number,
  thinking: number,
): number {
  const base = cacheRead + cacheCreate + input + output + thinking
  return base > 0 ? (cacheRead / base) * 100 : 0
}

/** Computes cache hit-rate metrics grouped by model. */
export function computeCacheHitRateByModel(
  data: DailyUsage[],
): CacheHitRateByModelChartDataPoint[] {
  if (data.length === 0) return []

  const sorted = [...data]
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length === 0) return []

  const trailingWindow = sorted.slice(-Math.min(7, sorted.length))
  const totals = new Map<
    string,
    { cacheRead: number; cacheCreate: number; input: number; output: number; thinking: number }
  >()
  const trailing = new Map<
    string,
    { cacheRead: number; cacheCreate: number; input: number; output: number; thinking: number }
  >()

  const updateMetricMap = (
    target: Map<
      string,
      { cacheRead: number; cacheCreate: number; input: number; output: number; thinking: number }
    >,
    modelName: string,
    cacheRead: number,
    cacheCreate: number,
    input: number,
    output: number,
    thinking: number,
  ) => {
    const key = normalizeModelName(modelName)
    const current = target.get(key) ?? {
      cacheRead: 0,
      cacheCreate: 0,
      input: 0,
      output: 0,
      thinking: 0,
    }
    current.cacheRead += cacheRead
    current.cacheCreate += cacheCreate
    current.input += input
    current.output += output
    current.thinking += thinking
    target.set(key, current)
  }

  for (const day of sorted) {
    for (const breakdown of day.modelBreakdowns) {
      updateMetricMap(
        totals,
        breakdown.modelName,
        breakdown.cacheReadTokens,
        breakdown.cacheCreationTokens,
        breakdown.inputTokens,
        breakdown.outputTokens,
        breakdown.thinkingTokens,
      )
    }
  }

  for (const day of trailingWindow) {
    for (const breakdown of day.modelBreakdowns) {
      updateMetricMap(
        trailing,
        breakdown.modelName,
        breakdown.cacheReadTokens,
        breakdown.cacheCreationTokens,
        breakdown.inputTokens,
        breakdown.outputTokens,
        breakdown.thinkingTokens,
      )
    }
  }

  const sumMetricMap = (
    source: Map<
      string,
      { cacheRead: number; cacheCreate: number; input: number; output: number; thinking: number }
    >,
  ) =>
    Array.from(source.values()).reduce(
      (acc, metric) => ({
        cacheRead: acc.cacheRead + metric.cacheRead,
        cacheCreate: acc.cacheCreate + metric.cacheCreate,
        input: acc.input + metric.input,
        output: acc.output + metric.output,
        thinking: acc.thinking + metric.thinking,
      }),
      { cacheRead: 0, cacheCreate: 0, input: 0, output: 0, thinking: 0 },
    )

  const totalAll = sumMetricMap(totals)
  const trailingAll = sumMetricMap(trailing)

  const rows: CacheHitRateByModelChartDataPoint[] = [
    {
      model: 'Total',
      totalRate: computeCacheHitRate(
        totalAll.cacheRead,
        totalAll.cacheCreate,
        totalAll.input,
        totalAll.output,
        totalAll.thinking,
      ),
      trailing7Rate: computeCacheHitRate(
        trailingAll.cacheRead,
        trailingAll.cacheCreate,
        trailingAll.input,
        trailingAll.output,
        trailingAll.thinking,
      ),
      totalBaseTokens:
        totalAll.cacheRead +
        totalAll.cacheCreate +
        totalAll.input +
        totalAll.output +
        totalAll.thinking,
      trailing7BaseTokens:
        trailingAll.cacheRead +
        trailingAll.cacheCreate +
        trailingAll.input +
        trailingAll.output +
        trailingAll.thinking,
    },
  ]

  const modelRows = Array.from(totals.entries())
    .map(([model, metric]) => {
      const trailingMetric = trailing.get(model) ?? {
        cacheRead: 0,
        cacheCreate: 0,
        input: 0,
        output: 0,
        thinking: 0,
      }
      return {
        model,
        totalRate: computeCacheHitRate(
          metric.cacheRead,
          metric.cacheCreate,
          metric.input,
          metric.output,
          metric.thinking,
        ),
        trailing7Rate: computeCacheHitRate(
          trailingMetric.cacheRead,
          trailingMetric.cacheCreate,
          trailingMetric.input,
          trailingMetric.output,
          trailingMetric.thinking,
        ),
        totalBaseTokens:
          metric.cacheRead + metric.cacheCreate + metric.input + metric.output + metric.thinking,
        trailing7BaseTokens:
          trailingMetric.cacheRead +
          trailingMetric.cacheCreate +
          trailingMetric.input +
          trailingMetric.output +
          trailingMetric.thinking,
      }
    })
    .filter((entry) => entry.totalBaseTokens > 0)
    .sort((a, b) => b.totalBaseTokens - a.totalBaseTokens)

  return [...rows, ...modelRows]
}

/** Returns usage rows whose cost is an outlier by standard deviation. */
export function computeAnomalies(data: DailyUsage[], threshold = 2): DailyUsage[] {
  if (data.length < 3) return []
  const costs = data.map((d) => d.totalCost)
  const mean = costs.reduce((s, v) => s + v, 0) / costs.length
  const stdDev = Math.sqrt(costs.reduce((s, v) => s + (v - mean) ** 2, 0) / costs.length)
  if (stdDev === 0) return []
  return data.filter((d) => Math.abs(d.totalCost - mean) > threshold * stdDev)
}

/** Fits a simple linear regression across ordered numeric values. */
export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 }
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0
  for (let i = 0; i < n; i++) {
    const value = values[i]
    if (value === undefined) continue
    sumX += i
    sumY += value
    sumXY += i * value
    sumXX += i * i
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = average(values)
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length)
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * q
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const lowerValue = sorted[lower]
  const upperValue = sorted[upper]
  if (lowerValue === undefined || upperValue === undefined) return 0
  if (lower === upper) return lowerValue
  const weight = index - lower
  return lowerValue * (1 - weight) + upperValue * weight
}

function winsorizedAverage(values: number[], limit = 0.15): number {
  if (values.length === 0) return 0
  if (values.length < 4) return average(values)
  const low = quantile(values, limit)
  const high = quantile(values, 1 - limit)
  return average(values.map((value) => Math.min(high, Math.max(low, value))))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Labels the confidence attached to a current-month forecast. */
export type ForecastConfidence = 'low' | 'medium' | 'high'

/** Describes one elapsed calendar day in the month-to-date forecast series. */
export interface CurrentMonthForecastPoint {
  date: string
  cost: number
}

/** Captures the shared current-month forecast used by dashboard forecast views. */
export interface CurrentMonthForecast {
  currentMonth: string
  monthData: DailyUsage[]
  currentMonthTotal: number
  elapsedDays: number
  elapsedCalendarSeries: CurrentMonthForecastPoint[]
  daysInMonth: number
  remainingDays: number
  projectedDailyBurn: number
  volatility: number
  lowerDaily: number
  upperDaily: number
  forecastTotal: number
  dailyAvgTrend: {
    avg: number
    change: number
  }
  confidence: ForecastConfidence
}

/** Extends the shared current-month forecast with its owning provider. */
export interface ProviderCurrentMonthForecast extends CurrentMonthForecast {
  provider: string
}

/** Groups the current-month forecast results for all visible providers. */
export interface CurrentMonthProviderForecasts {
  currentMonth: string
  elapsedDays: number
  daysInMonth: number
  remainingDays: number
  providers: ProviderCurrentMonthForecast[]
  currentMonthTotal: number
  forecastTotal: number
}

/** Bundles the shared dashboard forecast outputs derived from one month-to-date input. */
export interface DashboardForecastState {
  costForecast: CurrentMonthForecast | null
  providerForecast: CurrentMonthProviderForecasts | null
}

/** Forecasts the current month total from elapsed daily costs. */
export function computeCurrentMonthForecast(data: DailyUsage[]): CurrentMonthForecast | null {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const lastEntry = sorted[sorted.length - 1]
  if (!lastEntry) return null

  const lastDate = new Date(lastEntry.date + 'T00:00:00')
  const currentMonth = lastEntry.date.slice(0, 7)
  const monthData = sorted.filter((d) => d.date.startsWith(currentMonth))

  if (monthData.length < 2) return null

  const monthTotal = monthData.reduce((sum, day) => sum + day.totalCost, 0)
  const monthCostMap = new Map(monthData.map((day) => [day.date, day.totalCost]))
  const daysInMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0).getDate()
  const elapsedDays = lastDate.getDate()
  const remainingDays = Math.max(0, daysInMonth - elapsedDays)

  const elapsedCalendarSeries = Array.from({ length: elapsedDays }, (_, index) => {
    const day = index + 1
    const date = `${currentMonth}-${String(day).padStart(2, '0')}`
    return {
      date,
      cost: monthCostMap.get(date) ?? 0,
    }
  })

  const elapsedCosts = elapsedCalendarSeries.map((point) => point.cost)
  const monthToDateAvg = monthTotal / elapsedDays
  const recentWindow = elapsedCosts.slice(-Math.min(7, elapsedCosts.length))
  const previousWindow = elapsedCosts.slice(
    -Math.min(14, elapsedCosts.length),
    -Math.min(7, elapsedCosts.length),
  )
  const recentAvg = winsorizedAverage(recentWindow)
  const previousAvg = previousWindow.length > 0 ? winsorizedAverage(previousWindow) : 0
  const trendAdjustment =
    previousAvg > 0 ? clamp((recentAvg - previousAvg) / previousAvg, -0.35, 0.35) * 0.25 : 0
  const projectedDailyBurn = Math.max(
    0,
    (monthToDateAvg * 0.6 + recentAvg * 0.4) * (1 + trendAdjustment),
  )

  const volatility = stdDev(recentWindow.length >= 4 ? recentWindow : elapsedCosts)
  const lowerDaily = Math.max(0, projectedDailyBurn - volatility)
  const upperDaily = projectedDailyBurn + volatility
  const forecastTotal = monthTotal + projectedDailyBurn * remainingDays
  const dailyAvgTrend =
    previousAvg > 0
      ? { avg: recentAvg, change: ((recentAvg - previousAvg) / previousAvg) * 100 }
      : { avg: recentAvg, change: 0 }

  let confidence: ForecastConfidence = 'low'
  if (elapsedDays >= 14 && volatility <= projectedDailyBurn * 0.75) confidence = 'high'
  else if (elapsedDays >= 7 && volatility <= projectedDailyBurn * 1.25) confidence = 'medium'

  return {
    currentMonth,
    monthData,
    currentMonthTotal: monthTotal,
    elapsedDays,
    elapsedCalendarSeries,
    daysInMonth,
    remainingDays,
    projectedDailyBurn,
    volatility,
    lowerDaily,
    upperDaily,
    forecastTotal,
    dailyAvgTrend,
    confidence,
  }
}

function createForecastDay(date: string, totalCost: number): DailyUsage {
  return {
    date,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    totalCost,
    requestCount: 0,
    modelsUsed: [],
    modelBreakdowns: [],
  }
}

/** Forecasts current-month totals separately for each visible provider. */
export function computeCurrentMonthProviderForecasts(
  data: DailyUsage[],
): CurrentMonthProviderForecasts | null {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const lastEntry = sorted[sorted.length - 1]
  if (!lastEntry) return null

  const currentMonth = lastEntry.date.slice(0, 7)
  const monthData = sorted.filter((entry) => entry.date.startsWith(currentMonth))
  if (monthData.length < 2) return null

  const elapsedDays = Number(lastEntry.date.slice(8, 10))
  if (!Number.isFinite(elapsedDays) || elapsedDays < 2) return null

  const providerCostMaps = new Map<string, Map<string, number>>()
  const providerTotals = new Map<string, number>()

  for (const day of monthData) {
    for (const breakdown of day.modelBreakdowns) {
      const provider = getModelProvider(breakdown.modelName)
      const dateCosts = providerCostMaps.get(provider) ?? new Map<string, number>()
      dateCosts.set(day.date, (dateCosts.get(day.date) ?? 0) + breakdown.cost)
      providerCostMaps.set(provider, dateCosts)
      providerTotals.set(provider, (providerTotals.get(provider) ?? 0) + breakdown.cost)
    }
  }

  const providers = Array.from(providerCostMaps.keys())
    .filter((provider) => (providerTotals.get(provider) ?? 0) > 0)
    .sort((left, right) => {
      const delta = (providerTotals.get(right) ?? 0) - (providerTotals.get(left) ?? 0)
      return delta !== 0 ? delta : left.localeCompare(right)
    })

  if (providers.length === 0) return null

  const providerForecasts = providers
    .map((provider) => {
      const providerCostMap = providerCostMaps.get(provider) ?? new Map<string, number>()
      const providerData = Array.from({ length: elapsedDays }, (_, index) => {
        const day = index + 1
        const date = `${currentMonth}-${String(day).padStart(2, '0')}`
        return createForecastDay(date, providerCostMap.get(date) ?? 0)
      })

      const forecast = computeCurrentMonthForecast(providerData)
      if (!forecast) return null

      return {
        provider,
        ...forecast,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  if (providerForecasts.length === 0) return null

  return {
    currentMonth,
    elapsedDays: providerForecasts[0]?.elapsedDays ?? elapsedDays,
    daysInMonth: providerForecasts[0]?.daysInMonth ?? elapsedDays,
    remainingDays: providerForecasts[0]?.remainingDays ?? 0,
    providers: providerForecasts,
    currentMonthTotal: providerForecasts.reduce((sum, entry) => sum + entry.currentMonthTotal, 0),
    forecastTotal: providerForecasts.reduce((sum, entry) => sum + entry.forecastTotal, 0),
  }
}

/** Builds the shared dashboard forecast state from the month-to-date filtered dataset. */
export function computeDashboardForecastState(data: DailyUsage[]): DashboardForecastState {
  return {
    costForecast: computeCurrentMonthForecast(data),
    providerForecast: computeCurrentMonthProviderForecasts(data),
  }
}
