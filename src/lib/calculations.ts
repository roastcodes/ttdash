import type { DailyUsage, DashboardMetrics } from '@/types'
import { normalizeModelName } from './model-utils'

export function computeMetrics(data: DailyUsage[]): DashboardMetrics {
  if (data.length === 0) {
    return {
      totalCost: 0, totalTokens: 0, activeDays: 0, topModel: null,
      cacheHitRate: 0, costPerMillion: 0, avgDailyCost: 0, avgRequestsPerDay: 0,
      topDay: null, cheapestDay: null, totalInput: 0, totalOutput: 0,
      totalCacheRead: 0, totalCacheCreate: 0, totalThinking: 0, totalRequests: 0, weekOverWeekChange: null,
    }
  }

  let topDay = { date: data[0].date, cost: data[0].totalCost }
  let cheapestDay = { date: data[0].date, cost: data[0].totalCost }
  let totalCost = 0
  let totalTokens = 0
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreate = 0
  let totalThinking = 0
  let totalRequests = 0
  let activeDays = 0
  const modelCosts = new Map<string, number>()

  for (const d of data) {
    totalCost += d.totalCost
    totalTokens += d.totalTokens
    totalInput += d.inputTokens
    totalOutput += d.outputTokens
    totalCacheRead += d.cacheReadTokens
    totalCacheCreate += d.cacheCreationTokens
    totalThinking += d.thinkingTokens
    totalRequests += d.requestCount
    activeDays += d._aggregatedDays ?? 1

    if (d.totalCost > topDay.cost) topDay = { date: d.date, cost: d.totalCost }
    if (d.totalCost < cheapestDay.cost) cheapestDay = { date: d.date, cost: d.totalCost }
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      modelCosts.set(name, (modelCosts.get(name) ?? 0) + mb.cost)
    }
  }

  const avgDailyCost = totalCost / activeDays
  const avgRequestsPerDay = totalRequests / activeDays
  const costPerMillion = totalTokens > 0 ? totalCost / (totalTokens / 1_000_000) : 0
  const cacheBase = totalCacheRead + totalCacheCreate + totalInput + totalOutput + totalThinking
  const cacheHitRate = cacheBase > 0 ? (totalCacheRead / cacheBase) * 100 : 0

  let topModel: { name: string; cost: number } | null = null
  for (const [name, cost] of modelCosts) {
    if (!topModel || cost > topModel.cost) topModel = { name, cost }
  }

  // Week-over-week change
  const weekOverWeekChange = computeWeekOverWeekChange(data)

  return {
    totalCost, totalTokens, activeDays, topModel, cacheHitRate,
    costPerMillion, avgDailyCost, avgRequestsPerDay, topDay, cheapestDay,
    totalInput, totalOutput, totalCacheRead, totalCacheCreate,
    totalThinking, totalRequests,
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
  const result: (number | undefined)[] = new Array(values.length)
  let sum = 0

  for (let i = 0; i < values.length; i++) {
    sum += values[i]

    if (i >= window) {
      sum -= values[i - window]
    }

    result[i] = i < window - 1 ? undefined : sum / window
  }

  return result
}

export function computeModelCosts(data: DailyUsage[]): Map<string, {
  cost: number; tokens: number; input: number; output: number;
  cacheRead: number; cacheCreate: number; thinking: number; requests: number; days: number
}> {
  const map = new Map<string, {
    cost: number; tokens: number; input: number; output: number;
    cacheRead: number; cacheCreate: number; thinking: number; requests: number; days: number; _dates: Set<string>
  }>()
  for (const d of data) {
    const entryDays = d._aggregatedDays ?? 1
    for (const mb of d.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      const existing = map.get(name) ?? { cost: 0, tokens: 0, input: 0, output: 0, cacheRead: 0, cacheCreate: 0, thinking: 0, requests: 0, days: 0, _dates: new Set<string>() }
      existing.cost += mb.cost
      existing.tokens += mb.inputTokens + mb.outputTokens + mb.cacheCreationTokens + mb.cacheReadTokens + mb.thinkingTokens
      existing.input += mb.inputTokens
      existing.output += mb.outputTokens
      existing.cacheRead += mb.cacheReadTokens
      existing.cacheCreate += mb.cacheCreationTokens
      existing.thinking += mb.thinkingTokens
      existing.requests += mb.requestCount
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
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function winsorizedAverage(values: number[], limit = 0.15): number {
  if (values.length === 0) return 0
  if (values.length < 4) return average(values)
  const low = quantile(values, limit)
  const high = quantile(values, 1 - limit)
  return average(values.map(value => Math.min(high, Math.max(low, value))))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function computeCurrentMonthForecast(data: DailyUsage[]) {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
  const currentMonth = sorted[sorted.length - 1].date.slice(0, 7)
  const monthData = sorted.filter(d => d.date.startsWith(currentMonth))

  if (monthData.length < 2) return null

  const monthTotal = monthData.reduce((sum, day) => sum + day.totalCost, 0)
  const monthCostMap = new Map(monthData.map(day => [day.date, day.totalCost]))
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

  const elapsedCosts = elapsedCalendarSeries.map(point => point.cost)
  const monthToDateAvg = monthTotal / elapsedDays
  const recentWindow = elapsedCosts.slice(-Math.min(7, elapsedCosts.length))
  const previousWindow = elapsedCosts.slice(-Math.min(14, elapsedCosts.length), -Math.min(7, elapsedCosts.length))
  const recentAvg = winsorizedAverage(recentWindow)
  const previousAvg = previousWindow.length > 0 ? winsorizedAverage(previousWindow) : 0
  const trendAdjustment = previousAvg > 0
    ? clamp((recentAvg - previousAvg) / previousAvg, -0.35, 0.35) * 0.25
    : 0
  const projectedDailyBurn = Math.max(0, (monthToDateAvg * 0.6 + recentAvg * 0.4) * (1 + trendAdjustment))

  const volatility = stdDev(recentWindow.length >= 4 ? recentWindow : elapsedCosts)
  const lowerDaily = Math.max(0, projectedDailyBurn - volatility)
  const upperDaily = projectedDailyBurn + volatility
  const forecastTotal = monthTotal + projectedDailyBurn * remainingDays
  const dailyAvgTrend = previousAvg > 0
    ? { avg: recentAvg, change: ((recentAvg - previousAvg) / previousAvg) * 100 }
    : { avg: recentAvg, change: 0 }

  let confidence = 'niedrig'
  if (elapsedDays >= 14 && volatility <= projectedDailyBurn * 0.75) confidence = 'hoch'
  else if (elapsedDays >= 7 && volatility <= projectedDailyBurn * 1.25) confidence = 'mittel'

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
