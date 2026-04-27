import { getModelProvider, normalizeModelName } from '@/lib/model-utils'
import type { AggregateMetrics, DailyUsage } from '@/types'

/** Describes the aria-sort value rendered for sortable table headers. */
export type AriaSortDirection = 'ascending' | 'descending' | 'none'

/** Stores the currently selected sort key and direction. */
export type SortState<SortKey extends string> = {
  sortKey: SortKey
  sortAsc: boolean
}

/** Identifies sortable provider-efficiency columns. */
export type ProviderEfficiencySortKey =
  | 'cost'
  | 'share'
  | 'requests'
  | 'tokens'
  | 'costPerRequest'
  | 'costPerMillion'
  | 'cacheShare'

/** Identifies sortable model-efficiency columns. */
export type ModelEfficiencySortKey =
  | 'cost'
  | 'tokens'
  | 'costPerMillion'
  | 'costPerRequest'
  | 'tokensPerRequest'
  | 'share'
  | 'requestShare'
  | 'cacheShare'
  | 'thinkingShare'
  | 'days'
  | 'requests'
  | 'costPerDay'

/** Identifies sortable recent-days columns. */
export type RecentDaysSortKey = 'date' | 'cost' | 'tokens' | 'costPerM'

/** Describes one provider-efficiency row with derived ratios. */
export interface ProviderEfficiencyRow extends AggregateMetrics {
  name: string
  share: number
  costPerRequest: number
  costPerMillion: number
  cacheShare: number
}

/** Describes one model-efficiency row with derived ratios. */
export interface ModelEfficiencyRow {
  name: string
  cost: number
  tokens: number
  costPerMillion: number
  costPerRequest: number
  tokensPerRequest: number
  share: number
  requestShare: number
  cacheShare: number
  thinkingShare: number
  days: number
  requests: number
  costPerDay: number
}

/** Describes benchmark values attached to one recent-day row. */
export type RecentDayBenchmark = {
  prevCostDelta?: number
  avgCost7?: number
  avgRequests7?: number
}

/** Describes one normalized model identity for a recent-day row. */
export type RecentDayModel = {
  name: string
  provider: string
}

/** Describes one recent-day row with derived display data. */
export type RecentDayRow = {
  day: DailyUsage
  benchmark: RecentDayBenchmark | undefined
  costPerM: number
  uniqueModels: RecentDayModel[]
}

/** Summarizes the recent-day table input data. */
export type RecentDaysSummary = {
  totalCost: number
  totalTokens: number
  totalRequests: number
  cacheShare: number
  top: DailyUsage | null
}

/** Defines how many recent-day rows are rendered before show-all mode. */
export const RECENT_DAYS_DEFAULT_VISIBLE_ROWS = 30

/** Defines how many rows are revealed per animation frame in show-all mode. */
export const RECENT_DAYS_SHOW_ALL_BATCH_SIZE = 120

/** Resolves the next sort state after activating a sortable header. */
export function resolveNextSortState<SortKey extends string>(
  current: SortState<SortKey>,
  nextKey: SortKey,
): SortState<SortKey> {
  if (nextKey === current.sortKey) {
    return { sortKey: current.sortKey, sortAsc: !current.sortAsc }
  }

  return { sortKey: nextKey, sortAsc: false }
}

/** Converts the current sort state into an aria-sort value for one field. */
export function getAriaSort<SortKey extends string>(
  field: SortKey,
  state: SortState<SortKey>,
): AriaSortDirection {
  return state.sortKey === field ? (state.sortAsc ? 'ascending' : 'descending') : 'none'
}

/** Computes the first visible batch size for recent-day show-all mode. */
export function getShowAllInitialVisibleCount(totalRows: number): number {
  return Math.min(RECENT_DAYS_DEFAULT_VISIBLE_ROWS + RECENT_DAYS_SHOW_ALL_BATCH_SIZE, totalRows)
}

/** Schedules progressive row reveal batches until all recent-day rows are visible. */
export function scheduleProgressiveRowReveal(
  totalRows: number,
  setVisibleCount: (value: number | ((previous: number) => number)) => void,
  scheduleFrame: (callback: FrameRequestCallback) => number,
): number | null {
  const initialVisibleCount = getShowAllInitialVisibleCount(totalRows)
  setVisibleCount(initialVisibleCount)

  if (initialVisibleCount >= totalRows) {
    return null
  }

  const revealMore = () => {
    setVisibleCount((previous) => {
      if (previous >= totalRows) return previous
      const next = Math.min(previous + RECENT_DAYS_SHOW_ALL_BATCH_SIZE, totalRows)
      if (next < totalRows) {
        scheduleFrame(revealMore)
      }
      return next
    })
  }

  return scheduleFrame(revealMore)
}

/** Derives provider-efficiency rows from aggregate provider metrics. */
export function deriveProviderEfficiencyRows(
  providerMetrics: ReadonlyMap<string, AggregateMetrics>,
  totalCost: number,
): ProviderEfficiencyRow[] {
  return Array.from(providerMetrics.entries()).map(([name, value]) => ({
    name,
    ...value,
    share: totalCost > 0 ? (value.cost / totalCost) * 100 : 0,
    costPerRequest: value.requests > 0 ? value.cost / value.requests : 0,
    costPerMillion: value.tokens > 0 ? value.cost / (value.tokens / 1_000_000) : 0,
    cacheShare: value.tokens > 0 ? (value.cacheRead / value.tokens) * 100 : 0,
  }))
}

/** Sorts provider-efficiency rows by the selected numeric field. */
export function sortProviderEfficiencyRows(
  rows: ProviderEfficiencyRow[],
  sortKey: ProviderEfficiencySortKey,
  sortAsc: boolean,
): ProviderEfficiencyRow[] {
  return [...rows].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })
}

/** Finds the provider with the lowest non-zero cost per million tokens. */
export function findMostEfficientProvider(
  rows: ProviderEfficiencyRow[],
): ProviderEfficiencyRow | null {
  return (
    [...rows]
      .filter((row) => row.tokens > 0)
      .sort((a, b) => a.costPerMillion - b.costPerMillion)[0] ?? null
  )
}

/** Sums request counts across provider-efficiency rows. */
export function getProviderTotalRequests(rows: ProviderEfficiencyRow[]): number {
  return rows.reduce((sum, row) => sum + row.requests, 0)
}

/** Derives model-efficiency rows from aggregate model metrics. */
export function deriveModelEfficiencyRows(
  modelCosts: ReadonlyMap<
    string,
    {
      cost: number
      tokens: number
      input?: number
      output?: number
      cacheRead?: number
      cacheCreate?: number
      thinking?: number
      days: number
      requests: number
      costPerDay?: number
    }
  >,
  totalCost: number,
): ModelEfficiencyRow[] {
  const models = Array.from(modelCosts.entries()).map(([name, value]) => ({
    name,
    cost: value.cost,
    tokens: value.tokens,
    costPerMillion: value.tokens > 0 ? value.cost / (value.tokens / 1_000_000) : 0,
    costPerRequest: value.requests > 0 ? value.cost / value.requests : 0,
    tokensPerRequest: value.requests > 0 ? value.tokens / value.requests : 0,
    share: totalCost > 0 ? (value.cost / totalCost) * 100 : 0,
    requestShare: 0,
    cacheShare: value.tokens > 0 ? ((value.cacheRead ?? 0) / value.tokens) * 100 : 0,
    thinkingShare: value.tokens > 0 ? ((value.thinking ?? 0) / value.tokens) * 100 : 0,
    days: value.days,
    requests: value.requests,
    costPerDay: value.days > 0 ? value.cost / value.days : 0,
  }))
  const totalRequests = models.reduce((sum, model) => sum + model.requests, 0)

  return models.map((model) => ({
    ...model,
    requestShare: totalRequests > 0 ? (model.requests / totalRequests) * 100 : 0,
  }))
}

/** Sorts model-efficiency rows by the selected numeric field. */
export function sortModelEfficiencyRows(
  rows: ModelEfficiencyRow[],
  sortKey: ModelEfficiencySortKey,
  sortAsc: boolean,
): ModelEfficiencyRow[] {
  return [...rows].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })
}

/** Finds the model with the lowest non-zero cost per million tokens. */
export function findMostEfficientModel(rows: ModelEfficiencyRow[]): ModelEfficiencyRow | null {
  return (
    [...rows]
      .filter((model) => model.tokens > 0)
      .sort((a, b) => a.costPerMillion - b.costPerMillion)[0] ?? null
  )
}

/** Sums request counts across model-efficiency rows. */
export function getModelTotalRequests(rows: ModelEfficiencyRow[]): number {
  return rows.reduce((sum, model) => sum + model.requests, 0)
}

/** Builds a deduplicated normalized model list for one usage day. */
export function getUniqueModelsForDay(day: DailyUsage): RecentDayModel[] {
  return day.modelBreakdowns
    .map((modelBreakdown) => ({
      name: normalizeModelName(modelBreakdown.modelName),
      provider: getModelProvider(modelBreakdown.modelName),
    }))
    .filter(
      (entry, index, values) =>
        values.findIndex((item) => item.name === entry.name && item.provider === entry.provider) ===
        index,
    )
}

/** Builds rolling benchmark values keyed by recent-day date. */
export function buildRecentDaysBenchmarkMap(data: DailyUsage[]): Map<string, RecentDayBenchmark> {
  const map = new Map<string, RecentDayBenchmark>()
  let rollingCost = 0
  let rollingRequests = 0

  for (let index = 0; index < data.length; index += 1) {
    const current = data[index]
    if (!current) continue

    if (index > 7) {
      const outgoing = data[index - 8]
      if (outgoing) {
        rollingCost -= outgoing.totalCost
        rollingRequests -= outgoing.requestCount
      }
    }

    if (index > 0) {
      const previousForWindow = data[index - 1]
      if (previousForWindow) {
        rollingCost += previousForWindow.totalCost
        rollingRequests += previousForWindow.requestCount
      }
    }

    const previous = index > 0 ? data[index - 1] : null
    const windowSize = Math.min(index, 7)
    const prevCostDelta =
      previous && previous.totalCost > 0
        ? ((current.totalCost - previous.totalCost) / previous.totalCost) * 100
        : null

    map.set(current.date, {
      ...(prevCostDelta !== null ? { prevCostDelta } : {}),
      ...(windowSize > 0 ? { avgCost7: rollingCost / windowSize } : {}),
      ...(windowSize > 0 ? { avgRequests7: rollingRequests / windowSize } : {}),
    })
  }

  return map
}

/** Sorts recent-day usage entries by the selected table field. */
export function sortRecentDays(
  data: DailyUsage[],
  sortKey: RecentDaysSortKey,
  sortAsc: boolean,
): DailyUsage[] {
  return [...data].sort((a, b) => {
    switch (sortKey) {
      case 'date':
        return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      case 'cost':
        return sortAsc ? a.totalCost - b.totalCost : b.totalCost - a.totalCost
      case 'tokens':
        return sortAsc ? a.totalTokens - b.totalTokens : b.totalTokens - a.totalTokens
      case 'costPerM': {
        const aPerMillion = a.totalTokens > 0 ? a.totalCost / (a.totalTokens / 1_000_000) : 0
        const bPerMillion = b.totalTokens > 0 ? b.totalCost / (b.totalTokens / 1_000_000) : 0
        return sortAsc ? aPerMillion - bPerMillion : bPerMillion - aPerMillion
      }
    }
  })
}

/** Attaches benchmark, cost-per-million, and model data to displayed days. */
export function buildRecentDayRows(
  displayed: DailyUsage[],
  benchmarkMap: Map<string, RecentDayBenchmark>,
): RecentDayRow[] {
  return displayed.map((day) => ({
    day,
    benchmark: benchmarkMap.get(day.date),
    costPerM: day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0,
    uniqueModels: getUniqueModelsForDay(day),
  }))
}

/** Summarizes recent-day usage rows for table header cards. */
export function summarizeRecentDays(data: DailyUsage[]): RecentDaysSummary | null {
  if (data.length === 0) return null

  let totalCost = 0
  let totalTokens = 0
  let totalRequests = 0
  let totalCacheRead = 0
  let top: DailyUsage | null = null

  for (const day of data) {
    totalCost += day.totalCost
    totalTokens += day.totalTokens
    totalRequests += day.requestCount
    totalCacheRead += day.cacheReadTokens
    if (!top || day.totalCost > top.totalCost) {
      top = day
    }
  }

  const cacheShare = totalTokens > 0 ? (totalCacheRead / totalTokens) * 100 : 0
  return { totalCost, totalTokens, totalRequests, cacheShare, top }
}

/** Finds the maximum cost used for recent-day bar scaling. */
export function getRecentDaysMaxCost(data: DailyUsage[]): number {
  return Math.max(...data.map((day) => day.totalCost), 0)
}
