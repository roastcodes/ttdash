import type {
  DailyUsage,
  ChartDataPoint,
  TokenChartDataPoint,
  RequestChartDataPoint,
  WeekdayData,
  ViewMode,
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

export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[] {
  return filterBySharedDateRange(data, start, end)
}

export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[] {
  return filterBySharedModels(data, selectedModels)
}

export function filterByProviders(data: DailyUsage[], selectedProviders: string[]): DailyUsage[] {
  return filterBySharedProviders(data, selectedProviders)
}

export function filterByMonth(data: DailyUsage[], month: string | null): DailyUsage[] {
  return filterBySharedMonth(data, month)
}

export function sortByDate(data: DailyUsage[]): DailyUsage[] {
  return sortSharedByDate(data)
}

export function getAvailableMonths(data: DailyUsage[]): string[] {
  const months = new Set<string>()
  for (const d of data) {
    months.add(d.date.slice(0, 7))
  }
  return Array.from(months).sort()
}

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

export function toCostChartData(data: DailyUsage[]): ChartDataPoint[] {
  const sorted = sortByDate(data)
  const costs = sorted.map((d) => d.totalCost)
  const ma7 = computeMovingAverage(costs)
  let cumulative = 0
  return sorted.map((d, i) => {
    cumulative += d.totalCost
    const point: ChartDataPoint = {
      date: d.date,
      cost: d.totalCost,
      cumulative,
    }
    const previousPoint = i > 0 ? sorted[i - 1] : undefined
    const costPrev = previousPoint?.totalCost ?? null
    if (costPrev !== null) point.costPrev = costPrev
    if (ma7[i] !== undefined) point.ma7 = ma7[i]
    return point
  })
}

export function toModelCostChartData(
  data: DailyUsage[],
): (ChartDataPoint & Record<string, number>)[] {
  const sorted = sortByDate(data)
  const allModels = new Set<string>()
  for (const d of sorted) {
    for (const mb of d.modelBreakdowns) {
      allModels.add(normalizeModelName(mb.modelName))
    }
  }
  const modelNames = Array.from(allModels).sort()

  // Compute per-model MA7
  const modelCostsArrays: Record<string, number[]> = {}
  for (const name of modelNames) modelCostsArrays[name] = []

  for (const d of sorted) {
    const dayCosts: Record<string, number> = {}
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      dayCosts[name] = (dayCosts[name] ?? 0) + mb.cost
    }
    for (const name of modelNames) {
      const costsForModel = modelCostsArrays[name]
      if (costsForModel) {
        costsForModel.push(dayCosts[name] ?? 0)
      }
    }
  }

  const modelMA7: Record<string, (number | undefined)[]> = {}
  for (const name of modelNames) {
    modelMA7[name] = computeMovingAverage(modelCostsArrays[name] ?? [])
  }

  return sorted.map((d, i) => {
    const point: Record<string, unknown> = { date: d.date, cost: d.totalCost }
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      point[name] = ((point[name] as number) ?? 0) + mb.cost
    }
    for (const name of modelNames) {
      if (!(name in point)) point[name] = 0
      point[`${name}_ma7`] = modelMA7[name]?.[i]
    }
    return point as ChartDataPoint & Record<string, number>
  })
}

export function toTokenChartData(data: DailyUsage[]): TokenChartDataPoint[] {
  const sorted = sortByDate(data)
  const totals = sorted.map((d) => d.totalTokens)
  const inputs = sorted.map((d) => d.inputTokens)
  const outputs = sorted.map((d) => d.outputTokens)
  const cacheWrites = sorted.map((d) => d.cacheCreationTokens)
  const cacheReads = sorted.map((d) => d.cacheReadTokens)
  const thinking = sorted.map((d) => d.thinkingTokens)
  const ma7 = computeMovingAverage(totals)
  const inputMA7 = computeMovingAverage(inputs)
  const outputMA7 = computeMovingAverage(outputs)
  const cacheWriteMA7 = computeMovingAverage(cacheWrites)
  const cacheReadMA7 = computeMovingAverage(cacheReads)
  const thinkingMA7 = computeMovingAverage(thinking)
  return sorted.map((d, i) => {
    const point: TokenChartDataPoint = {
      date: d.date,
      Input: d.inputTokens,
      Output: d.outputTokens,
      'Cache Write': d.cacheCreationTokens,
      'Cache Read': d.cacheReadTokens,
      Thinking: d.thinkingTokens,
      totalTokens: d.totalTokens,
    }
    const previousPoint = i > 0 ? sorted[i - 1] : undefined
    const totalTokensPrev = previousPoint?.totalTokens ?? null
    if (totalTokensPrev !== null) point.totalTokensPrev = totalTokensPrev
    if (ma7[i] !== undefined) point.tokenMA7 = ma7[i]
    if (inputMA7[i] !== undefined) point.inputMA7 = inputMA7[i]
    if (outputMA7[i] !== undefined) point.outputMA7 = outputMA7[i]
    if (cacheWriteMA7[i] !== undefined) point.cacheWriteMA7 = cacheWriteMA7[i]
    if (cacheReadMA7[i] !== undefined) point.cacheReadMA7 = cacheReadMA7[i]
    if (thinkingMA7[i] !== undefined) point.thinkingMA7 = thinkingMA7[i]
    return point
  })
}

export function toRequestChartData(data: DailyUsage[]): RequestChartDataPoint[] {
  const sorted = sortByDate(data)
  const totals = sorted.map((d) => d.requestCount)
  const totalMA7 = computeMovingAverage(totals)

  const allModels = new Set<string>()
  for (const d of sorted) {
    for (const mb of d.modelBreakdowns) {
      allModels.add(normalizeModelName(mb.modelName))
    }
  }
  const modelNames = Array.from(allModels).sort()

  const modelRequestArrays: Record<string, number[]> = {}
  for (const name of modelNames) modelRequestArrays[name] = []

  for (const d of sorted) {
    const dayRequests: Record<string, number> = {}
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      dayRequests[name] = (dayRequests[name] ?? 0) + mb.requestCount
    }
    for (const name of modelNames) {
      const requestsForModel = modelRequestArrays[name]
      if (requestsForModel) {
        requestsForModel.push(dayRequests[name] ?? 0)
      }
    }
  }

  const modelMA7: Record<string, (number | undefined)[]> = {}
  for (const name of modelNames) {
    modelMA7[name] = computeMovingAverage(modelRequestArrays[name] ?? [])
  }

  return sorted.map((d, i) => {
    const point: RequestChartDataPoint = {
      date: d.date,
      totalRequests: d.requestCount,
    }
    const previousPoint = i > 0 ? sorted[i - 1] : undefined
    const totalRequestsPrev = previousPoint?.requestCount ?? null
    if (totalRequestsPrev !== null) point.totalRequestsPrev = totalRequestsPrev
    if (totalMA7[i] !== undefined) point.totalRequestsMA7 = totalMA7[i]

    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      point[name] = ((point[name] as number) ?? 0) + mb.requestCount
    }

    for (const name of modelNames) {
      if (!(name in point)) point[name] = 0
      point[`${name}_ma7`] = modelMA7[name]?.[i]
    }

    return point
  })
}

export function toWeekdayData(data: DailyUsage[]): WeekdayData[] {
  const weekdayCosts: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  const weekdayFormatter = new Intl.DateTimeFormat(getCurrentLocale(), {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter
      .format(new Date(Date.UTC(2024, 0, 1 + index)))
      .replace('.', '')
      .slice(0, 2),
  )
  for (const d of data) {
    // Skip non-daily entries (monthly "2026-03" or yearly "2026")
    if (d.date.length !== 10) continue
    const date = new Date(d.date + 'T00:00:00')
    const dow = (date.getDay() + 6) % 7 // Monday = 0
    const costsForWeekday = weekdayCosts[dow]
    if (costsForWeekday) {
      costsForWeekday.push(d.totalCost)
    }
  }
  return weekdayLabels.map((day, i) => {
    const costs = weekdayCosts[i] ?? []
    const avg = costs.length > 0 ? costs.reduce((s, v) => s + v, 0) / costs.length : 0
    return { day, cost: avg }
  })
}

export function aggregateToDailyFormat(data: DailyUsage[], mode: ViewMode): DailyUsage[] {
  return aggregateSharedToDailyFormat(data, mode)
}

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
