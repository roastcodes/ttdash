import type { DailyUsage, DashboardMetrics, ViewMode } from './dashboard-types'

/** Aggregates usage rows to the requested dashboard view mode. */
export function aggregateToDailyFormat(data: DailyUsage[], viewMode: ViewMode): DailyUsage[]
/** Returns the busiest rolling seven-day window by cost. */
export function computeBusiestWeek(
  data: DailyUsage[],
): { start: string; end: string; cost: number } | null
/** Computes the core dashboard metrics for a dataset. */
export function computeMetrics(data: DailyUsage[]): DashboardMetrics
/** Computes a simple moving average over numeric values. */
export function computeMovingAverage(
  values: Array<number | undefined>,
  window?: number,
): Array<number | undefined>
/** Computes the relative week-over-week cost change. */
export function computeWeekOverWeekChange(data: DailyUsage[]): number | null
/** Filters usage rows by an inclusive ISO date range. */
export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[]
/** Filters usage rows to entries that contain selected models. */
export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[]
/** Filters usage rows to a specific calendar month. */
export function filterByMonth(data: DailyUsage[], month: string | null): DailyUsage[]
/** Filters usage rows to entries that contain selected providers. */
export function filterByProviders(data: DailyUsage[], selectedProviders: string[]): DailyUsage[]
/** Resolves the provider name for a model identifier. */
export function getModelProvider(raw: string): string
/** Normalizes raw model names to their dashboard label. */
export function normalizeModelName(raw: string): string
/** Sorts usage rows in ascending date order. */
export function sortByDate(data: DailyUsage[]): DailyUsage[]
