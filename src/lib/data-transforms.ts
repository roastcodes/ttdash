import type { DailyUsage, ChartDataPoint, TokenChartDataPoint, WeekdayData, ViewMode } from '@/types'
import { computeMovingAverage } from './calculations'
import { normalizeModelName } from './model-utils'
import { WEEKDAYS } from './constants'

export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[] {
  return data.filter(d => {
    if (start && d.date < start) return false
    if (end && d.date > end) return false
    return true
  })
}

export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[] {
  if (selectedModels.length === 0) return data
  return data.filter(d =>
    d.modelBreakdowns.some(mb => selectedModels.includes(normalizeModelName(mb.modelName)))
  )
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
  const sorted = sortByDate(data)
  return { start: sorted[0].date, end: sorted[sorted.length - 1].date }
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
  const ma7 = computeMovingAverage(totals)
  return sorted.map((d, i) => ({
    date: d.date,
    Input: d.inputTokens,
    Output: d.outputTokens,
    'Cache Write': d.cacheCreationTokens,
    'Cache Read': d.cacheReadTokens,
    tokenMA7: ma7[i],
  }))
}

export function toWeekdayData(data: DailyUsage[]): WeekdayData[] {
  const weekdayCosts: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const d of data) {
    const date = new Date(d.date + 'T00:00:00')
    const dow = (date.getDay() + 6) % 7 // Monday = 0
    weekdayCosts[dow].push(d.totalCost)
  }
  return WEEKDAYS.map((day, i) => {
    const costs = weekdayCosts[i]
    const avg = costs.length > 0 ? costs.reduce((s, v) => s + v, 0) / costs.length : 0
    return { day, cost: avg }
  })
}

export function aggregateByMonth(data: DailyUsage[]): { period: string; totalCost: number; totalTokens: number; inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; days: number; modelBreakdowns: DailyUsage['modelBreakdowns'] }[] {
  const map = new Map<string, {
    totalCost: number; totalTokens: number; inputTokens: number; outputTokens: number;
    cacheCreationTokens: number; cacheReadTokens: number; days: number;
    modelBreakdowns: DailyUsage['modelBreakdowns']
  }>()
  for (const d of data) {
    const month = d.date.slice(0, 7)
    const existing = map.get(month) ?? {
      totalCost: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0,
      cacheCreationTokens: 0, cacheReadTokens: 0, days: 0, modelBreakdowns: [],
    }
    existing.totalCost += d.totalCost
    existing.totalTokens += d.totalTokens
    existing.inputTokens += d.inputTokens
    existing.outputTokens += d.outputTokens
    existing.cacheCreationTokens += d.cacheCreationTokens
    existing.cacheReadTokens += d.cacheReadTokens
    existing.days += 1
    existing.modelBreakdowns = [...existing.modelBreakdowns, ...d.modelBreakdowns]
    map.set(month, existing)
  }
  return Array.from(map.entries())
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => a.period.localeCompare(b.period))
}
