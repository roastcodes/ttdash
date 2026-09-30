import type { DailyUsage } from '@/types'
import { calendarDate, calendarDay } from '../../shared/usage-quality.js'

/** Builds equal-length calendar periods, including sparse days and shorter previous months. */
export function buildPeriodComparison(
  data: DailyUsage[],
  preset: 'week' | 'month',
  endDate?: string,
) {
  const anchor = endDate ?? data.reduce((last, day) => (day.date > last ? day.date : last), '')
  const end = calendarDay(anchor)
  if (end === null)
    return { periodA: [], periodB: [], startA: '', endA: '', startB: '', endB: '', days: 0 }
  let startA: number
  let startB: number
  let days: number
  if (preset === 'week') {
    // Calendar ordinals are anchored on Thursday, 1970-01-01; Monday is offset 4.
    const sinceMonday = (((end + 3) % 7) + 7) % 7
    startA = end - sinceMonday
    startB = startA - 7
    days = sinceMonday + 1
  } else {
    startA = calendarDay(`${anchor.slice(0, 7)}-01`)!
    const previousLast = startA - 1
    const previousMonth = calendarDate(previousLast).slice(0, 7)
    startB = calendarDay(`${previousMonth}-01`)!
    days = Math.min(end - startA + 1, previousLast - startB + 1)
  }
  const range = {
    startA: calendarDate(startA),
    endA: calendarDate(startA + days - 1),
    startB: calendarDate(startB),
    endB: calendarDate(startB + days - 1),
    days,
  }
  return {
    ...range,
    periodA: data.filter((day) => day.date >= range.startA && day.date <= range.endA),
    periodB: data.filter((day) => day.date >= range.startB && day.date <= range.endB),
  }
}
