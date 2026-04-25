import { describe, expect, it } from 'vitest'
import {
  buildHeatmapCellMap,
  buildHeatmapCellRows,
  buildHeatmapDayLabels,
  buildHeatmapGrid,
  getHeatmapColor,
  resolveHeatmapDefaultFocusedDate,
  resolveHeatmapKeyboardTarget,
} from '@/lib/heatmap-calendar-data'
import type { DailyUsage } from '@/types'

function buildDay(date: string, totalCost: number): DailyUsage {
  return {
    date,
    inputTokens: totalCost,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: totalCost,
    totalCost,
    requestCount: totalCost,
    modelsUsed: [],
    modelBreakdowns: [],
  }
}

describe('heatmap calendar data', () => {
  it('builds a Monday-aligned daily heatmap grid with localized month labels', () => {
    const grid = buildHeatmapGrid(
      [buildDay('2026-04-07', 4), buildDay('2026-04-13', 6)],
      'cost',
      'en-US',
    )

    expect(grid.maxValue).toBe(6)
    expect(grid.weeks).toBe(2)
    expect(grid.months).toEqual([{ label: 'Apr', week: 0 }])
    expect(grid.cells[0]).toEqual({ date: '2026-04-06', value: 0, week: 0, day: 0 })
    expect(grid.cells.find((cell) => cell.date === '2026-04-07')).toMatchObject({
      value: 4,
      week: 0,
      day: 1,
    })
  })

  it('resolves request and token metrics without changing calendar shape', () => {
    const usage = buildDay('2026-04-07', 4)
    const requestGrid = buildHeatmapGrid([usage], 'requests', 'en-US')
    const tokenGrid = buildHeatmapGrid([usage], 'tokens', 'en-US')

    expect(requestGrid.cells.find((cell) => cell.date === usage.date)?.value).toBe(4)
    expect(tokenGrid.cells.find((cell) => cell.date === usage.date)?.value).toBe(4)
    expect(requestGrid.weeks).toBe(tokenGrid.weeks)
  })

  it('keeps keyboard navigation in row and column space', () => {
    const grid = buildHeatmapGrid(
      [
        buildDay('2026-04-06', 3),
        buildDay('2026-04-07', 4),
        buildDay('2026-04-13', 6),
        buildDay('2026-04-14', 7),
      ],
      'cost',
      'en-US',
    )
    const rows = buildHeatmapCellRows(grid.cells)
    const cellByDate = buildHeatmapCellMap(grid.cells)

    expect(resolveHeatmapKeyboardTarget('ArrowRight', '2026-04-06', rows, cellByDate)).toBe(
      '2026-04-13',
    )
    expect(resolveHeatmapKeyboardTarget('ArrowDown', '2026-04-13', rows, cellByDate)).toBe(
      '2026-04-14',
    )
    expect(resolveHeatmapKeyboardTarget('Home', '2026-04-14', rows, cellByDate)).toBe('2026-04-07')
    expect(resolveHeatmapKeyboardTarget('End', '2026-04-07', rows, cellByDate)).toBe('2026-04-14')
    expect(resolveHeatmapKeyboardTarget('Escape', '2026-04-07', rows, cellByDate)).toBeNull()
  })

  it('chooses a stable default focus date and color scale', () => {
    const grid = buildHeatmapGrid(
      [buildDay('2026-04-07', 0), buildDay('2026-04-08', 5)],
      'cost',
      'en-US',
    )

    expect(resolveHeatmapDefaultFocusedDate(grid.cells, '2026-04-20')).toBe('2026-04-08')
    expect(getHeatmapColor(0, 5, 215, false)).toBe('hsl(var(--muted))')
    expect(getHeatmapColor(5, 5, 215, false)).toBe('hsl(215, 78%, 40%)')
  })

  it('builds the same sparse weekday labels the SVG axis renders', () => {
    expect(buildHeatmapDayLabels('en-US')).toEqual(['Mo', '', 'We', '', 'Fr', '', 'Su'])
  })
})
