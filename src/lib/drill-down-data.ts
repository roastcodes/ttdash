import { getModelProvider, normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage } from '@/types'

/** Identifies the aggregation level represented by a drill-down date. */
export type DrillDownPeriodKind = 'day' | 'month' | 'year'

/** Describes an absolute and relative benchmark delta. */
export type DrillDownDelta = {
  absolute: number
  percent: number | null
}

/** Describes one normalized model row for the drill-down modal. */
export type DrillDownModelData = {
  name: string
  provider: string
  cost: number
  tokens: number
  input: number
  output: number
  cacheRead: number
  cacheCreate: number
  thinking: number
  requests: number
  costShare: number
  tokenShare: number
  costPerMillion: number | null
  costPerRequest: number | null
  tokensPerRequest: number | null
}

/** Describes one provider summary row for the drill-down modal. */
export type DrillDownProviderData = {
  provider: string
  cost: number
  tokens: number
  requests: number
  activeModels: number
  costShare: number
}

/** Identifies a token segment rendered in the drill-down distribution. */
export type DrillDownTokenSegmentId = 'cacheRead' | 'cacheWrite' | 'input' | 'output' | 'thinking'

/** Describes one raw token segment before localization. */
export type DrillDownTokenSegment = {
  id: DrillDownTokenSegmentId
  value: number
  color: string
}

/** Describes one token segment with its percentage width. */
export type DrillDownTokenDistributionSegment = DrillDownTokenSegment & {
  width: number
}

/** Groups all non-presentational values needed by the drill-down modal. */
export type DrillDownData = {
  periodKind: DrillDownPeriodKind
  sortedContextData: DailyUsage[]
  contextIndex: number
  previousEntry: DailyUsage | null
  previousSeven: DailyUsage[]
  tokensTotal: number
  hasTokens: boolean
  modelData: DrillDownModelData[]
  providerData: DrillDownProviderData[]
  pieData: Array<{ name: string; value: number }>
  cacheRate: number
  avgTokensPerRequest: number | null
  avgCostPerRequest: number | null
  costPerMillion: number | null
  hasRequestCounts: boolean
  costRanking: number
  requestRanking: number
  avgCost7: number | null
  avgRequests7: number | null
  avgTokens7: number | null
  avgCostPerMillion7: number | null
  previousTokens: number | null
  previousCostPerMillion: number | null
  topCostModel: DrillDownModelData | null
  topRequestModel: DrillDownModelData | null
  topTokenModel: DrillDownModelData | null
  priciestPerMillionModel: DrillDownModelData | null
  topThreeCostShare: number
  tokenSegments: DrillDownTokenSegment[]
  tokenDistributionSegments: DrillDownTokenDistributionSegment[]
}

/** Detects whether a drill-down date represents a day, month, or year. */
export function getDrillDownPeriodKind(date: string): DrillDownPeriodKind {
  if (/^\d{4}$/.test(date)) return 'year'
  if (/^\d{4}-\d{2}$/.test(date)) return 'month'
  return 'day'
}

/** Computes total tokens from the token columns on a usage entry. */
export function getDailyUsageTokenTotal(entry: DailyUsage): number {
  return (
    entry.cacheReadTokens +
    entry.cacheCreationTokens +
    entry.inputTokens +
    entry.outputTokens +
    entry.thinkingTokens
  )
}

/** Converts a cost and token count into cost per million tokens. */
export function toPerMillion(cost: number, tokens: number): number | null {
  return tokens > 0 ? cost / (tokens / 1_000_000) : null
}

/** Converts a value and request count into a per-request value. */
export function toPerRequest(value: number, requests: number): number | null {
  return requests > 0 ? value / requests : null
}

/** Computes absolute and percentage delta against a reference value. */
export function getDelta(current: number, reference: number | null): DrillDownDelta | null {
  if (reference === null) return null

  const absolute = current - reference
  const percent = reference !== 0 ? (absolute / reference) * 100 : null

  return { absolute, percent }
}

/** Aggregates raw model breakdowns into normalized model rows. */
export function deriveDrillDownModelData(
  day: DailyUsage,
  tokensTotal: number,
): DrillDownModelData[] {
  const map = new Map<
    string,
    {
      provider: string
      cost: number
      tokens: number
      input: number
      output: number
      cacheRead: number
      cacheCreate: number
      thinking: number
      requests: number
    }
  >()

  for (const modelBreakdown of day.modelBreakdowns) {
    const name = normalizeModelName(modelBreakdown.modelName)
    const provider = getModelProvider(modelBreakdown.modelName)
    const existing = map.get(name) ?? {
      provider,
      cost: 0,
      tokens: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheCreate: 0,
      thinking: 0,
      requests: 0,
    }

    existing.cost += modelBreakdown.cost
    existing.tokens +=
      modelBreakdown.inputTokens +
      modelBreakdown.outputTokens +
      modelBreakdown.cacheCreationTokens +
      modelBreakdown.cacheReadTokens +
      modelBreakdown.thinkingTokens
    existing.input += modelBreakdown.inputTokens
    existing.output += modelBreakdown.outputTokens
    existing.cacheRead += modelBreakdown.cacheReadTokens
    existing.cacheCreate += modelBreakdown.cacheCreationTokens
    existing.thinking += modelBreakdown.thinkingTokens
    existing.requests += modelBreakdown.requestCount

    map.set(name, existing)
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      ...value,
      costShare: day.totalCost > 0 ? (value.cost / day.totalCost) * 100 : 0,
      tokenShare: tokensTotal > 0 ? (value.tokens / tokensTotal) * 100 : 0,
      costPerMillion: toPerMillion(value.cost, value.tokens),
      costPerRequest: toPerRequest(value.cost, value.requests),
      tokensPerRequest: toPerRequest(value.tokens, value.requests),
    }))
    .sort((a, b) => b.cost - a.cost)
}

/** Aggregates normalized model rows into provider rows. */
export function deriveDrillDownProviderData(
  day: DailyUsage,
  modelData: DrillDownModelData[],
): DrillDownProviderData[] {
  const map = new Map<
    string,
    { cost: number; tokens: number; requests: number; activeModels: Set<string> }
  >()

  for (const model of modelData) {
    const existing = map.get(model.provider) ?? {
      cost: 0,
      tokens: 0,
      requests: 0,
      activeModels: new Set<string>(),
    }

    existing.cost += model.cost
    existing.tokens += model.tokens
    existing.requests += model.requests
    existing.activeModels.add(model.name)
    map.set(model.provider, existing)
  }

  return Array.from(map.entries())
    .map(([provider, value]) => ({
      provider,
      cost: value.cost,
      tokens: value.tokens,
      requests: value.requests,
      activeModels: value.activeModels.size,
      costShare: day.totalCost > 0 ? (value.cost / day.totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost)
}

/** Builds the fixed token segment order used by the modal. */
export function buildDrillDownTokenSegments(day: DailyUsage): DrillDownTokenSegment[] {
  return [
    { id: 'cacheRead', value: day.cacheReadTokens, color: 'hsl(160, 50%, 42%)' },
    { id: 'cacheWrite', value: day.cacheCreationTokens, color: 'hsl(262, 60%, 55%)' },
    { id: 'input', value: day.inputTokens, color: 'hsl(340, 55%, 52%)' },
    { id: 'output', value: day.outputTokens, color: 'hsl(35, 80%, 52%)' },
    { id: 'thinking', value: day.thinkingTokens, color: 'hsl(12, 78%, 56%)' },
  ]
}

/** Converts token segment values into rounded percentage widths. */
export function buildDrillDownTokenDistributionSegments(
  tokenSegments: DrillDownTokenSegment[],
  tokensTotal: number,
): DrillDownTokenDistributionSegment[] {
  if (tokensTotal <= 0) return []

  return tokenSegments.map((segment) => ({
    ...segment,
    width: Number(((segment.value / tokensTotal) * 100).toFixed(3)),
  }))
}

/** Derives the full non-presentational drill-down view model. */
export function deriveDrillDownData(day: DailyUsage, contextData: DailyUsage[]): DrillDownData {
  const periodKind = getDrillDownPeriodKind(day.date)
  const sortedContextData = [...contextData].sort((a, b) => a.date.localeCompare(b.date))
  const contextIndex = sortedContextData.findIndex((entry) => entry.date === day.date)
  const previousEntry = contextIndex > 0 ? (sortedContextData[contextIndex - 1] ?? null) : null
  const previousSeven =
    contextIndex > 0 ? sortedContextData.slice(Math.max(0, contextIndex - 7), contextIndex) : []
  const tokensTotal = getDailyUsageTokenTotal(day)
  const hasTokens = tokensTotal > 0
  const modelData = deriveDrillDownModelData(day, tokensTotal)
  const providerData = deriveDrillDownProviderData(day, modelData)
  const pieData = modelData.map((model) => ({ name: model.name, value: model.cost }))
  const cacheRate = hasTokens ? (day.cacheReadTokens / tokensTotal) * 100 : 0
  const avgTokensPerRequest = toPerRequest(tokensTotal, day.requestCount)
  const avgCostPerRequest = toPerRequest(day.totalCost, day.requestCount)
  const costPerMillion = toPerMillion(day.totalCost, tokensTotal)
  const hasRequestCounts =
    day.requestCount > 0 ||
    day.modelBreakdowns.some((modelBreakdown) => modelBreakdown.requestCount > 0) ||
    contextData.some((entry) => entry.requestCount > 0)
  const costRanking =
    [...contextData]
      .sort((a, b) => b.totalCost - a.totalCost)
      .findIndex((entry) => entry.date === day.date) + 1
  const requestRanking = hasRequestCounts
    ? [...contextData]
        .sort((a, b) => b.requestCount - a.requestCount)
        .findIndex((entry) => entry.date === day.date) + 1
    : 0

  const previousSevenCost = previousSeven.reduce((sum, entry) => sum + entry.totalCost, 0)
  const previousSevenRequests = previousSeven.reduce((sum, entry) => sum + entry.requestCount, 0)
  const previousSevenTokens = previousSeven.reduce(
    (sum, entry) => sum + getDailyUsageTokenTotal(entry),
    0,
  )
  const avgCost7 = previousSeven.length > 0 ? previousSevenCost / previousSeven.length : null
  const avgRequests7 =
    previousSeven.length > 0 ? previousSevenRequests / previousSeven.length : null
  const avgTokens7 = previousSeven.length > 0 ? previousSevenTokens / previousSeven.length : null
  const avgCostPerMillion7 =
    previousSeven.length > 0 ? toPerMillion(previousSevenCost, previousSevenTokens) : null
  const previousTokens = previousEntry ? getDailyUsageTokenTotal(previousEntry) : null
  const previousCostPerMillion = previousEntry
    ? toPerMillion(previousEntry.totalCost, getDailyUsageTokenTotal(previousEntry))
    : null

  const topCostModel = modelData[0] ?? null
  const topRequestModel = hasRequestCounts
    ? modelData.reduce(
        (best, current) => (!best || current.requests > best.requests ? current : best),
        null as DrillDownModelData | null,
      )
    : null
  const topTokenModel = modelData.reduce(
    (best, current) => (!best || current.tokens > best.tokens ? current : best),
    null as DrillDownModelData | null,
  )
  const priciestPerMillionModel = modelData.reduce(
    (best, current) => {
      if (current.costPerMillion === null) return best
      if (!best || best.costPerMillion === null || current.costPerMillion > best.costPerMillion) {
        return current
      }
      return best
    },
    null as DrillDownModelData | null,
  )
  const topThreeCostShare =
    day.totalCost > 0
      ? (modelData.slice(0, 3).reduce((sum, model) => sum + model.cost, 0) / day.totalCost) * 100
      : 0
  const tokenSegments = buildDrillDownTokenSegments(day)
  const tokenDistributionSegments = buildDrillDownTokenDistributionSegments(
    tokenSegments,
    tokensTotal,
  )

  return {
    periodKind,
    sortedContextData,
    contextIndex,
    previousEntry,
    previousSeven,
    tokensTotal,
    hasTokens,
    modelData,
    providerData,
    pieData,
    cacheRate,
    avgTokensPerRequest,
    avgCostPerRequest,
    costPerMillion,
    hasRequestCounts,
    costRanking,
    requestRanking,
    avgCost7,
    avgRequests7,
    avgTokens7,
    avgCostPerMillion7,
    previousTokens,
    previousCostPerMillion,
    topCostModel,
    topRequestModel,
    topTokenModel,
    priciestPerMillionModel,
    topThreeCostShare,
    tokenSegments,
    tokenDistributionSegments,
  }
}
