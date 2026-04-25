import { localToday, toLocalDateStr } from '@/lib/formatters'
import type { DailyUsage } from '@/types'

/** Identifies the activity metric rendered by a heatmap. */
export type HeatmapMetric = 'cost' | 'requests' | 'tokens'

/** Describes one rendered heatmap cell in week/day coordinates. */
export type HeatmapCell = {
  date: string
  value: number
  week: number
  day: number
}

/** Describes one localized month label and its starting week. */
export type HeatmapMonthLabel = {
  label: string
  week: number
}

/** Groups the full heatmap grid and scale derived from usage data. */
export type HeatmapGrid = {
  cells: HeatmapCell[]
  weeks: number
  months: HeatmapMonthLabel[]
  maxValue: number
}

/** Defines the square heatmap cell size in SVG pixels. */
export const HEATMAP_CELL_SIZE = 14

/** Defines the gap between heatmap cells in SVG pixels. */
export const HEATMAP_CELL_GAP = 2

/** Defines the full occupied size of one heatmap cell and its gap. */
export const HEATMAP_TOTAL_CELL_SIZE = HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP

/** Defines the left axis gutter for the heatmap SVG. */
export const HEATMAP_LEFT_GUTTER = 30

/** Defines the top month-label gutter for the heatmap SVG. */
export const HEATMAP_TOP_GUTTER = 26

/** Defines the extra animation delay applied per heatmap week. */
export const HEATMAP_CELL_STAGGER_WEEK_OFFSET_MS = 12

/** Defines the extra animation delay applied per heatmap weekday. */
export const HEATMAP_CELL_STAGGER_DAY_OFFSET_MS = 6

/** Defines the extra delay before revealing the current-day outline. */
export const HEATMAP_TODAY_OUTLINE_EXTRA_DELAY_MS = 90

/** Resolves the lightness bucket for one heatmap intensity. */
export function resolveHeatmapLightness(intensity: number, isDarkTheme: boolean): number {
  if (intensity < 0.15) return isDarkTheme ? 28 : 88
  if (intensity < 0.3) return isDarkTheme ? 36 : 80
  if (intensity < 0.45) return isDarkTheme ? 44 : 72
  if (intensity < 0.6) return isDarkTheme ? 52 : 64
  if (intensity < 0.75) return isDarkTheme ? 60 : 56
  if (intensity < 0.9) return isDarkTheme ? 68 : 48
  return isDarkTheme ? 76 : 40
}

/** Resolves the HSL fill color for one heatmap value. */
export function getHeatmapColor(
  value: number,
  maxValue: number,
  hue: number,
  isDarkTheme: boolean,
): string {
  if (value === 0 || maxValue <= 0) return 'hsl(var(--muted))'
  const intensity = Math.min(value / maxValue, 1)
  const saturation = isDarkTheme ? 68 : 78
  const lightness = resolveHeatmapLightness(intensity, isDarkTheme)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/** Reads the selected heatmap metric from a daily usage entry. */
export function getHeatmapMetricValue(entry: DailyUsage, metric: HeatmapMetric): number {
  if (metric === 'requests') return entry.requestCount
  if (metric === 'tokens') return entry.totalTokens
  return entry.totalCost
}

/** Builds sparse weekday labels for the heatmap SVG axis. */
export function buildHeatmapDayLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    index % 2 === 1
      ? ''
      : new Intl.DateTimeFormat(locale, { weekday: 'short' })
          .format(new Date(Date.UTC(2024, 0, 1 + index)))
          .slice(0, 2),
  )
}

/** Builds a Monday-aligned heatmap grid and localized month labels. */
export function buildHeatmapGrid(
  data: DailyUsage[],
  metric: HeatmapMetric,
  locale: string,
): HeatmapGrid {
  if (data.length === 0) return { cells: [], weeks: 0, months: [], maxValue: 0 }

  const valueMap = new Map<string, number>()
  let maxValue = 0
  for (const entry of data) {
    const value = getHeatmapMetricValue(entry, metric)
    valueMap.set(entry.date, value)
    if (value > maxValue) maxValue = value
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const firstEntry = sorted[0]
  const lastEntry = sorted[sorted.length - 1]
  if (!firstEntry || !lastEntry) return { cells: [], weeks: 0, months: [], maxValue: 0 }

  const startDate = new Date(`${firstEntry.date}T00:00:00`)
  const endDate = new Date(`${lastEntry.date}T00:00:00`)
  const startDow = (startDate.getDay() + 6) % 7
  const alignedStart = new Date(startDate)
  alignedStart.setDate(alignedStart.getDate() - startDow)

  const cells: HeatmapCell[] = []
  const months: HeatmapMonthLabel[] = []
  const currentDate = new Date(alignedStart)
  let week = 0
  let lastMonth = -1

  while (currentDate <= endDate || week === 0) {
    const date = toLocalDateStr(currentDate)
    const day = (currentDate.getDay() + 6) % 7
    const value = valueMap.get(date) ?? 0

    if (day === 0) {
      const month = currentDate.getMonth()
      if (month !== lastMonth) {
        months.push({
          label: currentDate.toLocaleDateString(locale, { month: 'short' }),
          week,
        })
        lastMonth = month
      }
    }

    cells.push({ date, value, week, day })

    currentDate.setDate(currentDate.getDate() + 1)
    if (day === 6) week += 1
    if (currentDate > endDate && day === 6) break
  }

  return { cells, weeks: week + 1, months, maxValue }
}

/** Groups heatmap cells by weekday for keyboard row navigation. */
export function buildHeatmapCellRows(cells: HeatmapCell[]): HeatmapCell[][] {
  return Array.from({ length: 7 }, (_, day) => cells.filter((cell) => cell.day === day))
}

/** Indexes heatmap cells by ISO date for keyboard navigation. */
export function buildHeatmapCellMap(cells: HeatmapCell[]): Map<string, HeatmapCell> {
  return new Map(cells.map((cell) => [cell.date, cell]))
}

/** Resolves the initial roving-tabindex target for a heatmap. */
export function resolveHeatmapDefaultFocusedDate(
  cells: HeatmapCell[],
  todayStr = localToday(),
): string | null {
  const availableDates = cells.map((cell) => cell.date)
  return (
    (availableDates.includes(todayStr) ? todayStr : undefined) ??
    cells.find((cell) => cell.value > 0)?.date ??
    availableDates[0] ??
    null
  )
}

/** Resolves the next heatmap cell for supported grid-navigation keys. */
export function resolveHeatmapKeyboardTarget(
  key: string,
  currentDate: string,
  cellRows: HeatmapCell[][],
  cellByDate: Map<string, HeatmapCell>,
): string | null {
  const currentCell = cellByDate.get(currentDate)
  if (!currentCell) return null

  const moveToCell = (rowIndex: number, columnIndex: number) => {
    const targetRow = cellRows[Math.max(0, Math.min(rowIndex, cellRows.length - 1))]
    if (!targetRow || targetRow.length === 0) return null

    const nextCell = targetRow[Math.max(0, Math.min(columnIndex, targetRow.length - 1))]
    return nextCell?.date ?? null
  }

  const moveToRowBoundary = (targetColumn: 0 | 'end') => {
    const row = cellRows[currentCell.day]
    if (!row || row.length === 0) return null
    const nextCell = targetColumn === 0 ? row[0] : row[row.length - 1]
    return nextCell?.date ?? null
  }

  switch (key) {
    case 'ArrowLeft':
      return moveToCell(currentCell.day, currentCell.week - 1)
    case 'ArrowRight':
      return moveToCell(currentCell.day, currentCell.week + 1)
    case 'ArrowUp':
      return moveToCell(currentCell.day - 1, currentCell.week)
    case 'ArrowDown':
      return moveToCell(currentCell.day + 1, currentCell.week)
    case 'Home':
      return moveToRowBoundary(0)
    case 'End':
      return moveToRowBoundary('end')
    default:
      return null
  }
}
