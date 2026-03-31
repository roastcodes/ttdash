import type { DailyUsage, DashboardMetrics } from '@/types'
import { normalizeModelName } from './model-utils'

export function computeMetrics(data: DailyUsage[]): DashboardMetrics {
  if (data.length === 0) {
    return {
      totalCost: 0, totalTokens: 0, activeDays: 0, topModel: null,
      cacheHitRate: 0, costPerMillion: 0, avgDailyCost: 0,
      topDay: null, cheapestDay: null, totalInput: 0, totalOutput: 0,
      totalCacheRead: 0, totalCacheCreate: 0, weekOverWeekChange: null,
    }
  }

  const totalCost = data.reduce((s, d) => s + d.totalCost, 0)
  const totalTokens = data.reduce((s, d) => s + d.totalTokens, 0)
  const totalInput = data.reduce((s, d) => s + d.inputTokens, 0)
  const totalOutput = data.reduce((s, d) => s + d.outputTokens, 0)
  const totalCacheRead = data.reduce((s, d) => s + d.cacheReadTokens, 0)
  const totalCacheCreate = data.reduce((s, d) => s + d.cacheCreationTokens, 0)

  const activeDays = data.reduce((s, d) => s + (d._aggregatedDays ?? 1), 0)
  const avgDailyCost = totalCost / activeDays
  const costPerMillion = totalTokens > 0 ? totalCost / (totalTokens / 1_000_000) : 0
  const cacheHitRate = (totalCacheRead + totalCacheCreate + totalInput + totalOutput) > 0
    ? (totalCacheRead / (totalCacheRead + totalCacheCreate + totalInput + totalOutput)) * 100
    : 0

  // Top/cheapest day
  let topDay = { date: data[0].date, cost: data[0].totalCost }
  let cheapestDay = { date: data[0].date, cost: data[0].totalCost }
  for (const d of data) {
    if (d.totalCost > topDay.cost) topDay = { date: d.date, cost: d.totalCost }
    if (d.totalCost < cheapestDay.cost) cheapestDay = { date: d.date, cost: d.totalCost }
  }

  // Top model
  const modelCosts = new Map<string, number>()
  for (const d of data) {
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      modelCosts.set(name, (modelCosts.get(name) ?? 0) + mb.cost)
    }
  }
  let topModel: { name: string; cost: number } | null = null
  for (const [name, cost] of modelCosts) {
    if (!topModel || cost > topModel.cost) topModel = { name, cost }
  }

  // Week-over-week change
  const weekOverWeekChange = computeWeekOverWeekChange(data)

  return {
    totalCost, totalTokens, activeDays, topModel, cacheHitRate,
    costPerMillion, avgDailyCost, topDay, cheapestDay,
    totalInput, totalOutput, totalCacheRead, totalCacheCreate,
    weekOverWeekChange,
  }
}

export function computeWeekOverWeekChange(data: DailyUsage[]): number | null {
  if (data.length < 14) return null
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const last7 = sorted.slice(-7)
  const prev7 = sorted.slice(-14, -7)
  const lastSum = last7.reduce((s, d) => s + d.totalCost, 0)
  const prevSum = prev7.reduce((s, d) => s + d.totalCost, 0)
  if (prevSum === 0) return null
  return ((lastSum - prevSum) / prevSum) * 100
}

export function computeMovingAverage(values: number[], window = 7): (number | undefined)[] {
  return values.map((_, i) => {
    if (i < window - 1) return undefined
    const slice = values.slice(i - window + 1, i + 1)
    return slice.reduce((s, v) => s + v, 0) / window
  })
}

export function computeModelCosts(data: DailyUsage[]): Map<string, {
  cost: number; tokens: number; input: number; output: number;
  cacheRead: number; cacheCreate: number; days: number
}> {
  const map = new Map<string, {
    cost: number; tokens: number; input: number; output: number;
    cacheRead: number; cacheCreate: number; days: number; _dates: Set<string>
  }>()
  for (const d of data) {
    const entryDays = d._aggregatedDays ?? 1
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      const existing = map.get(name) ?? { cost: 0, tokens: 0, input: 0, output: 0, cacheRead: 0, cacheCreate: 0, days: 0, _dates: new Set<string>() }
      existing.cost += mb.cost
      existing.tokens += mb.inputTokens + mb.outputTokens + mb.cacheCreationTokens + mb.cacheReadTokens
      existing.input += mb.inputTokens
      existing.output += mb.outputTokens
      existing.cacheRead += mb.cacheReadTokens
      existing.cacheCreate += mb.cacheCreationTokens
      if (!existing._dates.has(d.date)) {
        existing._dates.add(d.date)
        existing.days += entryDays
      }
      map.set(name, existing)
    }
  }
  return map
}

export function computeAnomalies(data: DailyUsage[], threshold = 2): DailyUsage[] {
  if (data.length < 3) return []
  const costs = data.map(d => d.totalCost)
  const mean = costs.reduce((s, v) => s + v, 0) / costs.length
  const stdDev = Math.sqrt(costs.reduce((s, v) => s + (v - mean) ** 2, 0) / costs.length)
  if (stdDev === 0) return []
  return data.filter(d => Math.abs(d.totalCost - mean) > threshold * stdDev)
}

export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 }
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}
