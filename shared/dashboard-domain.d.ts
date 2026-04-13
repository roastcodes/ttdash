import type { DailyUsage, DashboardMetrics, ViewMode } from '../src/types'

export function aggregateToDailyFormat(data: DailyUsage[], viewMode: ViewMode): DailyUsage[]
export function computeBusiestWeek(
  data: DailyUsage[],
): { start: string; end: string; cost: number } | null
export function computeMetrics(data: DailyUsage[]): DashboardMetrics
export function computeMovingAverage(
  values: Array<number | undefined>,
  window?: number,
): Array<number | undefined>
export function computeWeekOverWeekChange(data: DailyUsage[]): number | null
export function filterByDateRange(data: DailyUsage[], start?: string, end?: string): DailyUsage[]
export function filterByModels(data: DailyUsage[], selectedModels: string[]): DailyUsage[]
export function filterByMonth(data: DailyUsage[], month: string | null): DailyUsage[]
export function filterByProviders(data: DailyUsage[], selectedProviders: string[]): DailyUsage[]
export function getModelProvider(raw: string): string
export function normalizeModelName(raw: string): string
export function sortByDate(data: DailyUsage[]): DailyUsage[]
