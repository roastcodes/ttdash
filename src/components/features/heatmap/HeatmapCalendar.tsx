import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InfoButton } from '@/components/features/help/InfoButton'
import { CHART_HELP } from '@/lib/help-content'
import {
  formatCurrency,
  formatNumber,
  formatTokens,
  localToday,
  toLocalDateStr,
} from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import type { DailyUsage, ViewMode } from '@/types'

interface HeatmapCalendarProps {
  data: DailyUsage[]
  viewMode?: ViewMode
  metric?: 'cost' | 'requests' | 'tokens'
}

const CELL_SIZE = 14
const CELL_GAP = 2
const TOTAL = CELL_SIZE + CELL_GAP
const LEFT_GUTTER = 30
const TOP_GUTTER = 26

function getColor(value: number, maxValue: number, hue: number): string {
  if (value === 0) return 'hsl(224, 12%, 14%)'
  const intensity = Math.min(value / maxValue, 1)
  if (intensity < 0.15) return `hsl(${hue}, 70%, 18%)`
  if (intensity < 0.3) return `hsl(${hue}, 70%, 26%)`
  if (intensity < 0.45) return `hsl(${hue}, 70%, 34%)`
  if (intensity < 0.6) return `hsl(${hue}, 70%, 42%)`
  if (intensity < 0.75) return `hsl(${hue}, 70%, 52%)`
  if (intensity < 0.9) return `hsl(${hue}, 70%, 60%)`
  return `hsl(${hue}, 70%, 70%)`
}

export function HeatmapCalendar({
  data,
  viewMode = 'daily',
  metric = 'cost',
}: HeatmapCalendarProps) {
  const { t } = useTranslation()
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    date: string
    value: number
  } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => index).map((index) =>
        index % 2 === 1
          ? ''
          : new Intl.DateTimeFormat(getCurrentLocale(), { weekday: 'short' })
              .format(new Date(Date.UTC(2024, 0, 1 + index)))
              .slice(0, 2),
      ),
    [],
  )
  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getCurrentLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  )
  const config = {
    cost: {
      title: t('charts.heatmap.costTitle'),
      empty: t('charts.heatmap.costEmpty'),
      formatter: formatCurrency,
      accessor: (entry: DailyUsage) => entry.totalCost,
      hue: 215,
    },
    requests: {
      title: t('charts.heatmap.requestsTitle'),
      empty: t('charts.heatmap.requestsEmpty'),
      formatter: formatNumber,
      accessor: (entry: DailyUsage) => entry.requestCount,
      hue: 160,
    },
    tokens: {
      title: t('charts.heatmap.tokensTitle'),
      empty: t('charts.heatmap.tokensEmpty'),
      formatter: formatTokens,
      accessor: (entry: DailyUsage) => entry.totalTokens,
      hue: 35,
    },
  }[metric]
  const infoText =
    metric === 'cost'
      ? CHART_HELP.heatmap
      : metric === 'requests'
        ? CHART_HELP.requestHeatmap
        : CHART_HELP.tokenHeatmap

  const { cells, weeks, months, maxValue } = useMemo(() => {
    if (data.length === 0) return { cells: [], weeks: 0, months: [], maxValue: 0 }

    const valueMap = new Map<string, number>()
    let max = 0
    for (const d of data) {
      const value = config.accessor(d)
      valueMap.set(d.date, value)
      if (value > max) max = value
    }

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const firstEntry = sorted[0]
    const lastEntry = sorted[sorted.length - 1]
    if (!firstEntry || !lastEntry) return { cells: [], weeks: 0, months: [], maxValue: 0 }

    const startDate = new Date(firstEntry.date + 'T00:00:00')
    const endDate = new Date(lastEntry.date + 'T00:00:00')

    // Align to Monday
    const startDow = (startDate.getDay() + 6) % 7
    const alignedStart = new Date(startDate)
    alignedStart.setDate(alignedStart.getDate() - startDow)

    const result: { date: string; value: number; week: number; day: number }[] = []
    const monthLabels: { label: string; week: number }[] = []
    const currentDate = new Date(alignedStart)
    let week = 0
    let lastMonth = -1

    while (currentDate <= endDate || week === 0) {
      const dateStr = toLocalDateStr(currentDate)
      const dow = (currentDate.getDay() + 6) % 7
      const value = valueMap.get(dateStr) ?? 0

      if (dow === 0) {
        const m = currentDate.getMonth()
        if (m !== lastMonth) {
          monthLabels.push({
            label: currentDate.toLocaleDateString(getCurrentLocale(), { month: 'short' }),
            week,
          })
          lastMonth = m
        }
      }

      result.push({ date: dateStr, value, week, day: dow })

      currentDate.setDate(currentDate.getDate() + 1)
      if (dow === 6) week++
      if (currentDate > endDate && dow === 6) break
    }

    return { cells: result, weeks: week + 1, months: monthLabels, maxValue: max }
  }, [data, config])

  const todayStr = localToday()

  // Heatmap only makes sense for daily view
  if (viewMode !== 'daily') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {config.title}
            <InfoButton text={infoText} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">{config.empty}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('charts.heatmap.switchToDaily')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (cells.length === 0) return null

  const svgWidth = weeks * TOTAL + LEFT_GUTTER
  const svgHeight = 7 * TOTAL + TOP_GUTTER + 8

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {config.title}
          <InfoButton text={infoText} />
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div ref={overlayRef} className="relative overflow-visible z-10">
          <div className="overflow-x-auto overflow-y-hidden">
            <svg width={svgWidth} height={svgHeight} className="block">
              {/* Day labels */}
              {dayLabels.map(
                (label, i) =>
                  label && (
                    <text
                      key={i}
                      x={0}
                      y={TOP_GUTTER + i * TOTAL + CELL_SIZE - 2}
                      fontSize={9}
                      fill="hsl(220, 8%, 46%)"
                      className="font-mono"
                    >
                      {label}
                    </text>
                  ),
              )}

              {/* Month labels */}
              {months.map((m, i) => (
                <text
                  key={i}
                  x={LEFT_GUTTER + m.week * TOTAL}
                  y={12}
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
                const formattedDate = fullDateFormatter.format(new Date(`${cell.date}T00:00:00`))
                const accessibleLabel = t('charts.heatmap.cellLabel', {
                  date: formattedDate,
                  value: config.formatter(cell.value),
                })
                return (
                  <g key={i}>
                    <rect
                      x={LEFT_GUTTER + cell.week * TOTAL}
                      y={TOP_GUTTER + cell.day * TOTAL}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={2}
                      fill={getColor(cell.value, maxValue, config.hue)}
                      stroke="transparent"
                      strokeWidth={1.5}
                      className="transition-all duration-150 cursor-pointer focus-visible:stroke-primary"
                      tabIndex={0}
                      role="img"
                      aria-label={accessibleLabel}
                      aria-current={isToday ? 'date' : undefined}
                      onMouseEnter={(event) => {
                        const bounds = overlayRef.current?.getBoundingClientRect()
                        if (!bounds) return
                        setTooltip({
                          x: event.clientX - bounds.left,
                          y: event.clientY - bounds.top - 12,
                          date: cell.date,
                          value: cell.value,
                        })
                      }}
                      onFocus={(event) => {
                        const bounds = overlayRef.current?.getBoundingClientRect()
                        if (!bounds) return
                        const rect = event.currentTarget.getBoundingClientRect()
                        setTooltip({
                          x: rect.left - bounds.left + rect.width / 2,
                          y: rect.top - bounds.top - 8,
                          date: cell.date,
                          value: cell.value,
                        })
                      }}
                      onBlur={() => setTooltip(null)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <title>{accessibleLabel}</title>
                    </rect>
                    {isToday && (
                      <rect
                        x={LEFT_GUTTER + cell.week * TOTAL - 1}
                        y={TOP_GUTTER + cell.day * TOTAL - 1}
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
          </div>

          {tooltip && (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <span className="font-medium">{config.formatter(tooltip.value)}</span>
              <span className="text-muted-foreground ml-1">{tooltip.date}</span>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <span>{t('charts.heatmap.less')}</span>
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((level, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(level * maxValue, maxValue, config.hue) }}
              />
            ))}
            <span>{t('charts.heatmap.more')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
