import type { DailyUsage, ChartDataPoint, TokenChartDataPoint, RequestChartDataPoint, WeekdayData, ViewMode } from '@/types'
import { computeMovingAverage } from './calculations'
import { getModelProvider, normalizeModelName } from './model-utils'
import { getCurrentLocale } from './i18n'

function recalculateDayFromBreakdowns(day: DailyUsage, filteredBreakdowns: DailyUsage['modelBreakdowns']): DailyUsage {
  let totalCost = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let thinkingTokens = 0
  let requestCount = 0

  for (const mb of filteredBreakdowns) {
    totalCost += mb.cost
    inputTokens += mb.inputTokens
    outputTokens += mb.outputTokens
    cacheCreationTokens += mb.cacheCreationTokens
    cacheReadTokens += mb.cacheReadTokens
    thinkingTokens += mb.thinkingTokens
    requestCount += mb.requestCount
  }

  return {
    ...day,
    totalCost,
    totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    requestCount,
    modelBreakdowns: filteredBreakdowns,
    modelsUsed: filteredBreakdowns.map(mb => mb.modelName),
  }
}

export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[] {
  return data.filter(d => {
    if (start && d.date < start) return false
    if (end && d.date > end) return false
    return true
  })
}

export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[] {
  if (selectedModels.length === 0) return data
  const selected = new Set(selectedModels)

  return data
    .map(d => {
      const filteredBreakdowns = d.modelBreakdowns.filter(mb =>
        selected.has(normalizeModelName(mb.modelName))
      )

      if (filteredBreakdowns.length === 0) return null
      return recalculateDayFromBreakdowns(d, filteredBreakdowns)
    })
    .filter((d): d is DailyUsage => d !== null)
}

export function filterByProviders(data: DailyUsage[], selectedProviders: string[]): DailyUsage[] {
  if (selectedProviders.length === 0) return data
  const selected = new Set(selectedProviders)

  return data
    .map(d => {
      const filteredBreakdowns = d.modelBreakdowns.filter(mb =>
        selected.has(getModelProvider(mb.modelName))
      )

      if (filteredBreakdowns.length === 0) return null
      return recalculateDayFromBreakdowns(d, filteredBreakdowns)
    })
    .filter((d): d is DailyUsage => d !== null)
}

export function filterByMonth(data: DailyUsage[], month: string | null): DailyUsage[] {
  if (!month) return data
  return data.filter(d => d.date.startsWith(month))
}

export function sortByDate(data: DailyUsage[]): DailyUsage[] {
  return [...data].sort((a, b) => a.date.localeCompare(b.date))
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
  let start = data[0].date
  let end = data[0].date
  for (let i = 1; i < data.length; i++) {
    const date = data[i].date
    if (date < start) start = date
    if (date > end) end = date
  }
  return { start, end }
}

export function toCostChartData(data: DailyUsage[]): ChartDataPoint[] {
  const sorted = sortByDate(data)
  const costs = sorted.map(d => d.totalCost)
  const ma7 = computeMovingAverage(costs)
  let cumulative = 0
  return sorted.map((d, i) => {
    cumulative += d.totalCost
    return {
      date: d.date,
      cost: d.totalCost,
      costPrev: i > 0 ? sorted[i - 1].totalCost : undefined,
      ma7: ma7[i],
      cumulative,
    }
  })
}

export function toModelCostChartData(data: DailyUsage[]): (ChartDataPoint & Record<string, number>)[] {
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
      modelCostsArrays[name].push(dayCosts[name] ?? 0)
    }
  }

  const modelMA7: Record<string, (number | undefined)[]> = {}
  for (const name of modelNames) {
    modelMA7[name] = computeMovingAverage(modelCostsArrays[name])
  }

  return sorted.map((d, i) => {
    const point: Record<string, unknown> = { date: d.date, cost: d.totalCost }
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      point[name] = ((point[name] as number) ?? 0) + mb.cost
    }
    for (const name of modelNames) {
      if (!(name in point)) point[name] = 0
      point[`${name}_ma7`] = modelMA7[name][i]
    }
    return point as ChartDataPoint & Record<string, number>
  })
}

export function toTokenChartData(data: DailyUsage[]): TokenChartDataPoint[] {
  const sorted = sortByDate(data)
  const totals = sorted.map(d => d.totalTokens)
  const inputs = sorted.map(d => d.inputTokens)
  const outputs = sorted.map(d => d.outputTokens)
  const cacheWrites = sorted.map(d => d.cacheCreationTokens)
  const cacheReads = sorted.map(d => d.cacheReadTokens)
  const thinking = sorted.map(d => d.thinkingTokens)
  const ma7 = computeMovingAverage(totals)
  const inputMA7 = computeMovingAverage(inputs)
  const outputMA7 = computeMovingAverage(outputs)
  const cacheWriteMA7 = computeMovingAverage(cacheWrites)
  const cacheReadMA7 = computeMovingAverage(cacheReads)
  const thinkingMA7 = computeMovingAverage(thinking)
  return sorted.map((d, i) => ({
    date: d.date,
    Input: d.inputTokens,
    Output: d.outputTokens,
    'Cache Write': d.cacheCreationTokens,
    'Cache Read': d.cacheReadTokens,
    Thinking: d.thinkingTokens,
    totalTokens: d.totalTokens,
    totalTokensPrev: i > 0 ? sorted[i - 1].totalTokens : undefined,
    tokenMA7: ma7[i],
    inputMA7: inputMA7[i],
    outputMA7: outputMA7[i],
    cacheWriteMA7: cacheWriteMA7[i],
    cacheReadMA7: cacheReadMA7[i],
    thinkingMA7: thinkingMA7[i],
  }))
}

export function toRequestChartData(data: DailyUsage[]): RequestChartDataPoint[] {
  const sorted = sortByDate(data)
  const totals = sorted.map(d => d.requestCount)
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
      modelRequestArrays[name].push(dayRequests[name] ?? 0)
    }
  }

  const modelMA7: Record<string, (number | undefined)[]> = {}
  for (const name of modelNames) {
    modelMA7[name] = computeMovingAverage(modelRequestArrays[name])
  }

  return sorted.map((d, i) => {
    const point: Record<string, unknown> = {
      date: d.date,
      totalRequests: d.requestCount,
      totalRequestsPrev: i > 0 ? sorted[i - 1].requestCount : undefined,
      totalRequestsMA7: totalMA7[i],
    }

    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      point[name] = ((point[name] as number) ?? 0) + mb.requestCount
    }

    for (const name of modelNames) {
      if (!(name in point)) point[name] = 0
      point[`${name}_ma7`] = modelMA7[name][i]
    }

    return point as RequestChartDataPoint
  })
}

export function toWeekdayData(data: DailyUsage[]): WeekdayData[] {
  const weekdayCosts: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(getCurrentLocale(), { weekday: 'short' })
      .format(new Date(Date.UTC(2024, 0, 1 + index)))
      .replace('.', '')
      .slice(0, 2)
  )
  for (const d of data) {
    // Skip non-daily entries (monthly "2026-03" or yearly "2026")
    if (d.date.length !== 10) continue
    const date = new Date(d.date + 'T00:00:00')
    const dow = (date.getDay() + 6) % 7 // Monday = 0
    weekdayCosts[dow].push(d.totalCost)
  }
  return weekdayLabels.map((day, i) => {
    const costs = weekdayCosts[i]
    const avg = costs.length > 0 ? costs.reduce((s, v) => s + v, 0) / costs.length : 0
    return { day, cost: avg }
  })
}

export function aggregateToDailyFormat(data: DailyUsage[], mode: ViewMode): DailyUsage[] {
  if (mode === 'daily') return data

  const groupKey = mode === 'monthly'
    ? (date: string) => date.slice(0, 7)
    : (date: string) => date.slice(0, 4)

  const map = new Map<string, DailyUsage>()

  for (const d of data) {
    const key = groupKey(d.date)
    const existing = map.get(key)
    const days = d._aggregatedDays ?? 1

    if (!existing) {
      map.set(key, { ...d, date: key, _aggregatedDays: days })
    } else {
      existing.totalCost += d.totalCost
      existing.totalTokens += d.totalTokens
      existing.inputTokens += d.inputTokens
      existing.outputTokens += d.outputTokens
      existing.cacheCreationTokens += d.cacheCreationTokens
      existing.cacheReadTokens += d.cacheReadTokens
      existing.thinkingTokens += d.thinkingTokens
      existing.requestCount += d.requestCount
      existing._aggregatedDays = (existing._aggregatedDays ?? 1) + days
      // Merge model breakdowns
      existing.modelBreakdowns = [...existing.modelBreakdowns, ...d.modelBreakdowns]
      // Merge modelsUsed (unique)
      const allModels = new Set([...existing.modelsUsed, ...d.modelsUsed])
      existing.modelsUsed = Array.from(allModels)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function aggregateByMonth(data: DailyUsage[]): { period: string; totalCost: number; totalTokens: number; inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; thinkingTokens: number; requestCount: number; days: number; modelBreakdowns: DailyUsage['modelBreakdowns'] }[] {
  const map = new Map<string, {
    totalCost: number; totalTokens: number; inputTokens: number; outputTokens: number;
    cacheCreationTokens: number; cacheReadTokens: number; thinkingTokens: number; requestCount: number; days: number;
    modelBreakdowns: DailyUsage['modelBreakdowns']
  }>()
  for (const d of data) {
    const month = d.date.slice(0, 7)
    const existing = map.get(month) ?? {
      totalCost: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0,
      cacheCreationTokens: 0, cacheReadTokens: 0, thinkingTokens: 0, requestCount: 0, days: 0, modelBreakdowns: [],
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
