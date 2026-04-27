import { toLocalDateStr } from '@/lib/formatters'

/** Describes a keyboard command resolved by the date picker grid. */
export type DatePickerKeyboardAction =
  | { kind: 'focus'; date: string }
  | { kind: 'shift-month'; offset: -1 | 1 }
  | { kind: 'select'; date: string }
  | { kind: 'none' }

/** Parses a YYYY-MM-DD value as a local Date without timezone shifting. */
export function parseLocalDate(value?: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

/** Builds the visible Monday-first calendar cells for one displayed month. */
export function buildCalendarDays(displayMonth: Date): Array<Date | null> {
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<Date | null> = []

  for (let index = 0; index < startOffset; index += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day))

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Builds compact weekday labels for the date picker header. */
export function buildWeekdayLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(new Date(Date.UTC(2024, 0, 1 + index)))
      .replace('.', '')
      .slice(0, 2),
  )
}

/** Extracts selectable ISO date strings from rendered calendar cells. */
export function getSelectableDates(calendarDays: Array<Date | null>): string[] {
  return calendarDays.filter((day): day is Date => day !== null).map((day) => toLocalDateStr(day))
}

/** Maps selectable ISO date strings back to their Date objects. */
export function buildCalendarDayMap(calendarDays: Array<Date | null>): Map<string, Date> {
  return new Map(
    calendarDays
      .filter((day): day is Date => day !== null)
      .map((day) => [toLocalDateStr(day), day]),
  )
}

/** Resolves the best focus target when the displayed month or value changes. */
export function resolveFocusableDate({
  preferred,
  value,
  selectableDates,
  today,
}: {
  preferred: string | null | undefined
  value: string | undefined
  selectableDates: string[]
  today: string
}): string | null {
  if (preferred && selectableDates.includes(preferred)) return preferred
  if (value && selectableDates.includes(value)) return value
  if (selectableDates.includes(today)) return today
  return selectableDates[0] ?? null
}

/** Moves a date by month while clamping the day to the target month length. */
export function clampDateToTargetMonth(date: Date, monthOffset: number): Date {
  const targetYear = date.getFullYear()
  const targetMonth = date.getMonth() + monthOffset
  const targetDay = date.getDate()
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  return new Date(targetYear, targetMonth, Math.min(targetDay, daysInTargetMonth))
}

/** Converts a date picker key press into a focus, selection, or month action. */
export function resolveDatePickerKeyboardAction({
  key,
  currentDate,
  selectableDates,
  calendarDayByIso,
}: {
  key: string
  currentDate: string
  selectableDates: string[]
  calendarDayByIso: Map<string, Date>
}): DatePickerKeyboardAction {
  const currentIndex = selectableDates.indexOf(currentDate)
  if (currentIndex < 0) return { kind: 'none' }

  const moveToIndex = (nextIndex: number): DatePickerKeyboardAction => {
    const nextDate = selectableDates[Math.max(0, Math.min(nextIndex, selectableDates.length - 1))]
    return nextDate ? { kind: 'focus', date: nextDate } : { kind: 'none' }
  }

  switch (key) {
    case 'ArrowLeft':
      return moveToIndex(currentIndex - 1)
    case 'ArrowRight':
      return moveToIndex(currentIndex + 1)
    case 'ArrowUp':
      return moveToIndex(currentIndex - 7)
    case 'ArrowDown':
      return moveToIndex(currentIndex + 7)
    case 'Home': {
      const currentCell = calendarDayByIso.get(currentDate)
      if (!currentCell) return { kind: 'none' }
      return moveToIndex(currentIndex - ((currentCell.getDay() + 6) % 7))
    }
    case 'End': {
      const currentCell = calendarDayByIso.get(currentDate)
      if (!currentCell) return { kind: 'none' }
      return moveToIndex(currentIndex + (6 - ((currentCell.getDay() + 6) % 7)))
    }
    case 'PageUp':
      return { kind: 'shift-month', offset: -1 }
    case 'PageDown':
      return { kind: 'shift-month', offset: 1 }
    case 'Enter':
    case ' ':
      return { kind: 'select', date: currentDate }
    default:
      return { kind: 'none' }
  }
}
