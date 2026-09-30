import type { DailyUsage, ModelBreakdown } from './dashboard-types'

/** Describes whether request counters cover all, some, or none of the usage. */
export type RequestCountStatus = 'known' | 'partial' | 'unknown'
/** Identifies reported usage without an attributable model. */
export const UNASSIGNED_MODEL: string
/** Resolves counter provenance for normalized and legacy rows. */
export function getRequestCountStatus(entry: DailyUsage | ModelBreakdown): RequestCountStatus
/** Combines two counter provenance states. */
export function combineRequestCountStatus(
  left: RequestCountStatus,
  right: RequestCountStatus,
): RequestCountStatus
/** Tests whether a row reports any activity. */
export function hasUsageActivity(entry: DailyUsage): boolean
/** Converts a valid ISO date to a UTC calendar ordinal. */
export function calendarDay(date: string): number | null
/** Formats a UTC calendar ordinal. */
export function calendarDate(day: number): string
