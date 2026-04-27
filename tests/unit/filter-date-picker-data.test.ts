import { describe, expect, it } from 'vitest'
import {
  buildCalendarDayMap,
  buildCalendarDays,
  buildWeekdayLabels,
  clampDateToTargetMonth,
  getSelectableDates,
  parseLocalDate,
  resolveDatePickerKeyboardAction,
  resolveFocusableDate,
} from '@/lib/filter-date-picker-data'
import { toLocalDateStr } from '@/lib/formatters'

describe('filter date picker data', () => {
  it('parses local ISO dates and builds a Monday-first month grid', () => {
    const parsed = parseLocalDate('2026-04-06')
    const calendarDays = buildCalendarDays(new Date(2026, 3, 1))

    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(3)
    expect(parsed?.getDate()).toBe(6)
    expect(calendarDays.slice(0, 2)).toEqual([null, null])
    expect(getSelectableDates(calendarDays).slice(0, 3)).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ])
  })

  it('resolves keyboard actions for date movement, month changes, and selection', () => {
    const calendarDays = buildCalendarDays(new Date(2026, 3, 1))
    const selectableDates = getSelectableDates(calendarDays)
    const calendarDayByIso = buildCalendarDayMap(calendarDays)

    expect(
      resolveDatePickerKeyboardAction({
        key: 'ArrowRight',
        currentDate: '2026-04-06',
        selectableDates,
        calendarDayByIso,
      }),
    ).toEqual({ kind: 'focus', date: '2026-04-07' })
    expect(
      resolveDatePickerKeyboardAction({
        key: 'Home',
        currentDate: '2026-04-09',
        selectableDates,
        calendarDayByIso,
      }),
    ).toEqual({ kind: 'focus', date: '2026-04-06' })
    expect(
      resolveDatePickerKeyboardAction({
        key: 'PageDown',
        currentDate: '2026-04-09',
        selectableDates,
        calendarDayByIso,
      }),
    ).toEqual({ kind: 'shift-month', offset: 1 })
    expect(
      resolveDatePickerKeyboardAction({
        key: 'Enter',
        currentDate: '2026-04-09',
        selectableDates,
        calendarDayByIso,
      }),
    ).toEqual({ kind: 'select', date: '2026-04-09' })
  })

  it('chooses focus fallback dates and clamps cross-month navigation', () => {
    const selectableDates = ['2026-04-01', '2026-04-02']

    expect(
      resolveFocusableDate({
        preferred: '2026-04-02',
        value: '2026-04-01',
        selectableDates,
        today: '2026-04-03',
      }),
    ).toBe('2026-04-02')
    expect(
      resolveFocusableDate({
        preferred: '2026-04-03',
        value: '2026-04-01',
        selectableDates,
        today: '2026-04-02',
      }),
    ).toBe('2026-04-01')
    expect(toLocalDateStr(clampDateToTargetMonth(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
  })

  it('builds compact weekday labels for the picker header', () => {
    expect(buildWeekdayLabels('en-US')).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
  })
})
