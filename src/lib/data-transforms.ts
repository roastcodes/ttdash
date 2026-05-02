import type {
  DailyUsage,
  ChartDataPoint,
  TokenChartDataPoint,
  RequestChartDataPoint,
  WeekdayData,
  ViewMode,
  ModelCostChartPoint,
} from '@/types'
import { computeMovingAverage } from './calculations'
import {
  aggregateToDailyFormat as aggregateSharedToDailyFormat,
  filterByDateRange as filterBySharedDateRange,
  filterByModels as filterBySharedModels,
  filterByMonth as filterBySharedMonth,
  filterByProviders as filterBySharedProviders,
  sortByDate as sortSharedByDate,
} from '../../shared/dashboard-domain.js'
import { normalizeModelName } from './model-utils'
import { getCurrentLocale } from './i18n'

/** Filters usage rows by an inclusive ISO date range. */
export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[] {
  return filterBySharedDateRange(data, start, end)
}

/** Filters usage rows to entries that contain selected models. */
export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[] {
  return filterBySharedModels(data, selectedModels)
}

/** Filters usage rows to entries that contain selected providers. */
export function filterByProviders(data: DailyUsage[], selectedProviders: string[]): DailyUsage[] {
  return filterBySharedProviders(data, selectedProviders)
}

/** Filters usage rows to a specific calendar month. */
export function filterByMonth(data: DailyUsage[], month: string | null): DailyUsage[] {
  return filterBySharedMonth(data, month)
}

/** Sorts usage rows in ascending date order. */
export function sortByDate(data: DailyUsage[]): DailyUsage[] {
  return sortSharedByDate(data)
}

/** Builds the month-to-date daily dataset that powers the current-month forecast. */
export function getCurrentMonthForecastData(
  data: DailyUsage[],
  selectedProviders: string[] = [],
  selectedModels: string[] = [],
): DailyUsage[] {
  const sorted = sortByDate(data)
  const lastEntry = sorted[sorted.length - 1]
  if (!lastEntry) return []

  const currentMonth = lastEntry.date.slice(0, 7)
  let result = sorted.filter((entry) => entry.date.startsWith(currentMonth))
  result = filterByProviders(result, selectedProviders)
  result = filterByModels(result, selectedModels)
  return result
}

/** Returns the distinct months present in the dataset. */
export function getAvailableMonths(data: DailyUsage[]): string[] {
  const months = new Set<string>()
  for (const d of data) {
    months.add(d.date.slice(0, 7))
  }
  return Array.from(months).sort()
}

/** Returns the inclusive min/max date range for a dataset. */
export function getDateRange(data: DailyUsage[]): { start: string; end: string } | null {
  if (data.length === 0) return null
  let firstEntry: DailyUsage | null = null
  for (const entry of data) {
    if (entry) {
      firstEntry = entry
      break
    }
  }
  if (!firstEntry) return null

  let start = firstEntry.date
  let end = firstEntry.date
  for (let i = 0; i < data.length; i++) {
    const entry = data[i]
    if (!entry) continue
    const date = entry.date
    if (date < start) start = date
    if (date > end) end = date
  }
  return { start, end }
}

function getSortedData(data: DailyUsage[]) {
  return sortByDate(data)
}

// Fixed UTC reference date used only to generate weekday labels in calendar order.
// The displayed weekday names depend on locale, not on the specific calendar year.
const WEEKDAY_REFERENCE_YEAR = 2024
const WEEKDAY_REFERENCE_MONTH = 0
const WEEKDAY_REFERENCE_DAY = 1

function createWeekdayLabels(locale: string) {
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })

  return Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter
      .format(
        new Date(
          Date.UTC(WEEKDAY_REFERENCE_YEAR, WEEKDAY_REFERENCE_MONTH, WEEKDAY_REFERENCE_DAY + index),
        ),
      )
      .replace('.', '')
      .slice(0, 2),
  )
}

/** Describes the chart transform bundle built from filtered usage data. */
export interface DashboardChartTransforms {
  costChartData: ChartDataPoint[]
  modelCostChartData: ModelCostChartPoint[]
  tokenChartData: TokenChartDataPoint[]
  requestChartData: RequestChartDataPoint[]
  weekdayData: WeekdayData[]
}

/** Builds the memoized chart-ready datasets for the dashboard. */
export function buildDashboardChartTransforms(
  data: DailyUsage[],
  locale = getCurrentLocale(),
): DashboardChartTransforms {
  const sorted = getSortedData(data)
  if (sorted.length === 0) {
    return {
      costChartData: [],
      modelCostChartData: [],
      tokenChartData: [],
      requestChartData: [],
      weekdayData: createWeekdayLabels(locale).map((day) => ({ day, cost: 0 })),
    }
  }

  const costs: number[] = []
  const totals: number[] = []
  const inputs: number[] = []
  const outputs: number[] = []
  const cacheWrites: number[] = []
  const cacheReads: number[] = []
  const thinking: number[] = []
  const totalRequests: number[] = []
  const modelNameSet = new Set<string>()

  for (const entry of sorted) {
    costs.push(entry.totalCost)
    totals.push(entry.totalTokens)
    inputs.push(entry.inputTokens)
    outputs.push(entry.outputTokens)
    cacheWrites.push(entry.cacheCreationTokens)
    cacheReads.push(entry.cacheReadTokens)
    thinking.push(entry.thinkingTokens)
    totalRequests.push(entry.requestCount)

    for (const mb of entry.modelBreakdowns) {
      modelNameSet.add(normalizeModelName(mb.modelName))
    }
  }

  const costMA7 = computeMovingAverage(costs)
  const tokenMA7 = computeMovingAverage(totals)
  const inputMA7 = computeMovingAverage(inputs)
  const outputMA7 = computeMovingAverage(outputs)
  const cacheWriteMA7 = computeMovingAverage(cacheWrites)
  const cacheReadMA7 = computeMovingAverage(cacheReads)
  const thinkingMA7 = computeMovingAverage(thinking)
  const totalRequestMA7 = computeMovingAverage(totalRequests)

  const modelNames = Array.from(modelNameSet).sort()

  const modelCostArrays: Record<string, number[]> = {}
  const modelRequestArrays: Record<string, number[]> = {}
  for (const name of modelNames) {
    modelCostArrays[name] = []
    modelRequestArrays[name] = []
  }

  const weekdayLabels = createWeekdayLabels(locale)
  const weekdayCosts: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

  const modelBreakdownByIndex = sorted.map((entry) => {
    const costsByModel: Record<string, number> = {}
    const requestsByModel: Record<string, number> = {}

    for (const mb of entry.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      costsByModel[name] = (costsByModel[name] ?? 0) + mb.cost
      requestsByModel[name] = (requestsByModel[name] ?? 0) + mb.requestCount
    }

    for (const name of modelNames) {
      modelCostArrays[name]?.push(costsByModel[name] ?? 0)
      modelRequestArrays[name]?.push(requestsByModel[name] ?? 0)
    }

    if (entry.date.length === 10) {
      const date = new Date(entry.date + 'T00:00:00')
      const weekday = (date.getDay() + 6) % 7
      weekdayCosts[weekday]?.push(entry.totalCost)
    }

    return { costsByModel, requestsByModel }
  })

  const modelCostMA7: Record<string, (number | undefined)[]> = {}
  const modelRequestMA7: Record<string, (number | undefined)[]> = {}
  for (const name of modelNames) {
    modelCostMA7[name] = computeMovingAverage(modelCostArrays[name] ?? [])
    modelRequestMA7[name] = computeMovingAverage(modelRequestArrays[name] ?? [])
  }

  let cumulative = 0
  const costChartData: ChartDataPoint[] = []
  const modelCostChartData: ModelCostChartPoint[] = []
  const tokenChartData: TokenChartDataPoint[] = []
  const requestChartData: RequestChartDataPoint[] = []

  sorted.forEach((entry, index) => {
    cumulative += entry.totalCost
    const previousEntry = index > 0 ? sorted[index - 1] : undefined
    const currentModelBreakdown = modelBreakdownByIndex[index]

    const costPoint: ChartDataPoint = {
      date: entry.date,
      cost: entry.totalCost,
      cumulative,
    }
    if (previousEntry) {
      costPoint.costPrev = previousEntry.totalCost
    }
    if (costMA7[index] !== undefined) {
      costPoint.ma7 = costMA7[index]
    }
    costChartData.push(costPoint)

    const modelCostPoint: ModelCostChartPoint = { date: entry.date, cost: entry.totalCost }
    const requestPoint: RequestChartDataPoint = {
      date: entry.date,
      totalRequests: entry.requestCount,
    }
    if (previousEntry) {
      requestPoint.totalRequestsPrev = previousEntry.requestCount
    }
    if (totalRequestMA7[index] !== undefined) {
      requestPoint.totalRequestsMA7 = totalRequestMA7[index]
    }

    for (const name of modelNames) {
      modelCostPoint[name] = currentModelBreakdown?.costsByModel[name] ?? 0
      modelCostPoint[`${name}_ma7`] = modelCostMA7[name]?.[index]
      requestPoint[name] = currentModelBreakdown?.requestsByModel[name] ?? 0
      requestPoint[`${name}_ma7`] = modelRequestMA7[name]?.[index]
    }

    modelCostChartData.push(modelCostPoint)
    requestChartData.push(requestPoint)

    const tokenPoint: TokenChartDataPoint = {
      date: entry.date,
      Input: entry.inputTokens,
      Output: entry.outputTokens,
      'Cache Write': entry.cacheCreationTokens,
      'Cache Read': entry.cacheReadTokens,
      Thinking: entry.thinkingTokens,
      totalTokens: entry.totalTokens,
    }
    if (previousEntry) {
      tokenPoint.totalTokensPrev = previousEntry.totalTokens
    }
    if (tokenMA7[index] !== undefined) tokenPoint.tokenMA7 = tokenMA7[index]
    if (inputMA7[index] !== undefined) tokenPoint.inputMA7 = inputMA7[index]
    if (outputMA7[index] !== undefined) tokenPoint.outputMA7 = outputMA7[index]
    if (cacheWriteMA7[index] !== undefined) tokenPoint.cacheWriteMA7 = cacheWriteMA7[index]
    if (cacheReadMA7[index] !== undefined) tokenPoint.cacheReadMA7 = cacheReadMA7[index]
    if (thinkingMA7[index] !== undefined) tokenPoint.thinkingMA7 = thinkingMA7[index]
    tokenChartData.push(tokenPoint)
  })

  const weekdayData = weekdayLabels.map((day, index) => {
    const values = weekdayCosts[index] ?? []
    const average =
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    return { day, cost: average, weekdayIndex: index }
  })

  return {
    costChartData,
    modelCostChartData,
    tokenChartData,
    requestChartData,
    weekdayData,
  }
}

/** Returns chart-ready cost-over-time data. */
export function toCostChartData(data: DailyUsage[]): ChartDataPoint[] {
  return buildDashboardChartTransforms(data).costChartData
}

/** Returns chart-ready per-model cost data. */
export function toModelCostChartData(data: DailyUsage[]): ModelCostChartPoint[] {
  return buildDashboardChartTransforms(data).modelCostChartData
}

/** Returns chart-ready token composition data. */
export function toTokenChartData(data: DailyUsage[]): TokenChartDataPoint[] {
  return buildDashboardChartTransforms(data).tokenChartData
}

/** Returns chart-ready request volume data. */
export function toRequestChartData(data: DailyUsage[]): RequestChartDataPoint[] {
  return buildDashboardChartTransforms(data).requestChartData
}

/** Returns chart-ready weekday average cost data. */
export function toWeekdayData(data: DailyUsage[], locale = getCurrentLocale()): WeekdayData[] {
  return buildDashboardChartTransforms(data, locale).weekdayData
}

/** Aggregates usage rows to the requested dashboard view mode. */
export function aggregateToDailyFormat(data: DailyUsage[], mode: ViewMode): DailyUsage[] {
  return aggregateSharedToDailyFormat(data, mode)
}

/** Aggregates daily usage rows into monthly summaries. */
export function aggregateByMonth(data: DailyUsage[]): {
  period: string
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  thinkingTokens: number
  requestCount: number
  days: number
  modelBreakdowns: DailyUsage['modelBreakdowns']
}[] {
  const map = new Map<
    string,
    {
      totalCost: number
      totalTokens: number
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
      thinkingTokens: number
      requestCount: number
      days: number
      modelBreakdowns: DailyUsage['modelBreakdowns']
    }
  >()
  for (const d of data) {
    const month = d.date.slice(0, 7)
    const existing = map.get(month) ?? {
      totalCost: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      requestCount: 0,
      days: 0,
      modelBreakdowns: [],
    }
    existing.totalCost += d.totalCost
    existing.totalTokens += d.totalTokens
    existing.inputTokens += d.inputTokens
    existing.outputTokens += d.outputTokens
    existing.cacheCreationTokens += d.cacheCreationTokens
    existing.cacheReadTokens += d.cacheReadTokens
    existing.thinkingTokens += d.thinkingTokens
    existing.requestCount += d.requestCount
    existing.days += 1
    existing.modelBreakdowns = [...existing.modelBreakdowns, ...d.modelBreakdowns]
    map.set(month, existing)
  }
  return Array.from(map.entries())
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => a.period.localeCompare(b.period))
}
