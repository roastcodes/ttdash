import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { DailyUsage, ViewMode } from '@/types'

interface HeatmapCalendarProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

const CELL_SIZE = 14
const CELL_GAP = 2
const TOTAL = CELL_SIZE + CELL_GAP
const DAY_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']

function getColor(cost: number, maxCost: number): string {
  if (cost === 0) return 'hsl(224, 12%, 14%)'
  const intensity = Math.min(cost / maxCost, 1)
  if (intensity < 0.15) return 'hsl(215, 70%, 18%)'
  if (intensity < 0.30) return 'hsl(215, 70%, 26%)'
  if (intensity < 0.45) return 'hsl(215, 70%, 34%)'
  if (intensity < 0.60) return 'hsl(215, 70%, 42%)'
  if (intensity < 0.75) return 'hsl(215, 70%, 52%)'
  if (intensity < 0.90) return 'hsl(215, 70%, 60%)'
  return 'hsl(215, 70%, 70%)'
}

export function HeatmapCalendar({ data, viewMode = 'daily' }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; cost: number } | null>(null)

  const { cells, weeks, months, maxCost } = useMemo(() => {
    if (data.length === 0) return { cells: [], weeks: 0, months: [], maxCost: 0 }

    const costMap = new Map<string, number>()
    let max = 0
    for (const d of data) {
      costMap.set(d.date, d.totalCost)
      if (d.totalCost > max) max = d.totalCost
    }

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const startDate = new Date(sorted[0].date + 'T00:00:00')
    const endDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00')

    // Align to Monday
    const startDow = (startDate.getDay() + 6) % 7
    const alignedStart = new Date(startDate)
    alignedStart.setDate(alignedStart.getDate() - startDow)

    const result: { date: string; cost: number; week: number; day: number }[] = []
    const monthLabels: { label: string; week: number }[] = []
    let currentDate = new Date(alignedStart)
    let week = 0
    let lastMonth = -1

    while (currentDate <= endDate || week === 0) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const dow = (currentDate.getDay() + 6) % 7
      const cost = costMap.get(dateStr) ?? 0

      if (dow === 0) {
        const m = currentDate.getMonth()
        if (m !== lastMonth) {
          monthLabels.push({
            label: currentDate.toLocaleDateString('de-CH', { month: 'short' }),
            week,
          })
          lastMonth = m
        }
      }

      result.push({ date: dateStr, cost, week, day: dow })

      currentDate.setDate(currentDate.getDate() + 1)
      if (dow === 6) week++
      if (currentDate > endDate && dow === 6) break
    }

    return { cells: result, weeks: week + 1, months: monthLabels, maxCost: max }
  }, [data])

  const todayStr = new Date().toISOString().slice(0, 10)

  // Heatmap only makes sense for daily view
  if (viewMode !== 'daily') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Kosten-Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Heatmap nur in der Tagesansicht verfügbar</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Wechsle zur Tagesansicht für die Kalender-Heatmap</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (cells.length === 0) return null

  const svgWidth = weeks * TOTAL + 30
  const svgHeight = 7 * TOTAL + 25

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Kosten-Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="block">
            {/* Day labels */}
            {DAY_LABELS.map((label, i) => (
              label && (
                <text
                  key={i}
                  x={0}
                  y={25 + i * TOTAL + CELL_SIZE - 2}
                  fontSize={9}
                  fill="hsl(220, 8%, 46%)"
                  className="font-mono"
                >
                  {label}
                </text>
              )
            ))}

            {/* Month labels */}
            {months.map((m, i) => (
              <text
                key={i}
                x={30 + m.week * TOTAL}
                y={10}
                fontSize={9}
                fill="hsl(220, 8%, 46%)"
                className="font-mono"
              >
                {m.label}
              </text>
            ))}

            {/* Cells */}
            {cells.map((cell, i) => {
              const isToday = cell.date === todayStr
              return (
                <g key={i}>
                  <rect
                    x={30 + cell.week * TOTAL}
                    y={18 + cell.day * TOTAL}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill={getColor(cell.cost, maxCost)}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGRectElement).getBoundingClientRect()
                      setTooltip({ x: rect.left, y: rect.top - 40, date: cell.date, cost: cell.cost })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {isToday && (
                    <rect
                      x={30 + cell.week * TOTAL - 1}
                      y={18 + cell.day * TOTAL - 1}
                      width={CELL_SIZE + 2}
                      height={CELL_SIZE + 2}
                      rx={3}
                      fill="none"
                      stroke="hsl(215, 70%, 55%)"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <span>Weniger</span>
            {[0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1].map((level, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(level * maxCost, maxCost) }}
              />
            ))}
            <span>Mehr</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-lg pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <span className="font-medium">{formatCurrency(tooltip.cost)}</span>
            <span className="text-muted-foreground ml-1">{tooltip.date}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
