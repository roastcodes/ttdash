import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InfoHeading } from '@/components/features/help/InfoHeading'
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

function resolveHeatmapLightness(intensity: number, isDarkTheme: boolean) {
  if (intensity < 0.15) return isDarkTheme ? 28 : 88
  if (intensity < 0.3) return isDarkTheme ? 36 : 80
  if (intensity < 0.45) return isDarkTheme ? 44 : 72
  if (intensity < 0.6) return isDarkTheme ? 52 : 64
  if (intensity < 0.75) return isDarkTheme ? 60 : 56
  if (intensity < 0.9) return isDarkTheme ? 68 : 48
  return isDarkTheme ? 76 : 40
}

function getColor(value: number, maxValue: number, hue: number, isDarkTheme: boolean): string {
  if (value === 0 || maxValue <= 0) return 'hsl(var(--muted))'
  const intensity = Math.min(value / maxValue, 1)
  const saturation = isDarkTheme ? 68 : 78
  const lightness = resolveHeatmapLightness(intensity, isDarkTheme)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/** Renders a calendar heatmap for daily cost, request, or token activity. */
export function HeatmapCalendar({
  data,
  viewMode = 'daily',
  metric = 'cost',
}: HeatmapCalendarProps) {
  const { t } = useTranslation()
  const locale = getCurrentLocale()
  const dayButtonRefs = useRef(new Map<string, SVGRectElement>())
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
          : new Intl.DateTimeFormat(locale, { weekday: 'short' })
              .format(new Date(Date.UTC(2024, 0, 1 + index)))
              .slice(0, 2),
      ),
    [locale],
  )
  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [locale],
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
            label: currentDate.toLocaleDateString(locale, { month: 'short' }),
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
  }, [config, data, locale])

  const todayStr = localToday()
  const isDarkTheme =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const axisColor = 'hsl(var(--muted-foreground))'
  const todayOutlineColor = 'hsl(var(--primary))'
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const scheduleFocus = useCallback((callback: () => void) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback)
      return
    }
    setTimeout(callback, 0)
  }, [])
  const availableDates = useMemo(() => cells.map((cell) => cell.date), [cells])
  const cellRows = useMemo(
    () => Array.from({ length: 7 }, (_, day) => cells.filter((cell) => cell.day === day)),
    [cells],
  )
  const defaultFocusedDate = useMemo(
    () =>
      (availableDates.includes(todayStr) ? todayStr : undefined) ??
      cells.find((cell) => cell.value > 0)?.date ??
      availableDates[0] ??
      null,
    [availableDates, cells, todayStr],
  )

  const focusDate = useCallback(
    (nextDate: string | null) => {
      if (!nextDate) return
      setFocusedDate(nextDate)
      scheduleFocus(() => {
        dayButtonRefs.current.get(nextDate)?.focus()
      })
    },
    [scheduleFocus],
  )

  useEffect(() => {
    if (!defaultFocusedDate) return
    if (!focusedDate || !availableDates.includes(focusedDate)) {
      setFocusedDate(defaultFocusedDate)
    }
  }, [availableDates, defaultFocusedDate, focusedDate])

  const handleCellKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGRectElement>, currentDate: string) => {
      const currentIndex = availableDates.indexOf(currentDate)
      if (currentIndex < 0) return

      const currentCell = cells[currentIndex]
      if (!currentCell) return

      const moveToIndex = (nextIndex: number) => {
        const nextDate = availableDates[Math.max(0, Math.min(nextIndex, availableDates.length - 1))]
        focusDate(nextDate ?? null)
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveToIndex(currentIndex - 1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveToIndex(currentIndex + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          moveToIndex(currentIndex - 7)
          break
        case 'ArrowDown':
          event.preventDefault()
          moveToIndex(currentIndex + 7)
          break
        case 'Home':
          event.preventDefault()
          moveToIndex(currentIndex - currentCell.day)
          break
        case 'End':
          event.preventDefault()
          moveToIndex(currentIndex + (6 - currentCell.day))
          break
        default:
          break
      }
    },
    [availableDates, cells, focusDate],
  )

  // Heatmap only makes sense for daily view
  if (viewMode !== 'daily') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <InfoHeading info={infoText}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {config.title}
            </CardTitle>
          </InfoHeading>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">{config.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
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
        <InfoHeading info={infoText}>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {config.title}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div ref={overlayRef} className="relative z-10 overflow-visible">
          <div className="overflow-x-auto overflow-y-hidden">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="block"
              role="grid"
              aria-label={config.title}
              aria-rowcount={7}
              aria-colcount={weeks}
            >
              {/* Day labels */}
              {dayLabels.map(
                (label, i) =>
                  label && (
                    <text
                      key={i}
                      x={0}
                      y={TOP_GUTTER + i * TOTAL + CELL_SIZE - 2}
                      fontSize={9}
                      fill={axisColor}
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
                  fill={axisColor}
                  className="font-mono"
                >
                  {m.label}
                </text>
              ))}

              {/* Cells */}
              {cellRows.map((row, rowIndex) => (
                <g key={rowIndex} role="row">
                  {row.map((cell) => {
                    const isToday = cell.date === todayStr
                    const formattedDate = fullDateFormatter.format(
                      new Date(`${cell.date}T00:00:00`),
                    )
                    const accessibleLabel = t('charts.heatmap.cellLabel', {
                      date: formattedDate,
                      value: config.formatter(cell.value),
                    })

                    return (
                      <g key={cell.date}>
                        <rect
                          ref={(node) => {
                            if (node) dayButtonRefs.current.set(cell.date, node)
                            else dayButtonRefs.current.delete(cell.date)
                          }}
                          x={LEFT_GUTTER + cell.week * TOTAL}
                          y={TOP_GUTTER + cell.day * TOTAL}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={2}
                          fill={getColor(cell.value, maxValue, config.hue, isDarkTheme)}
                          stroke="transparent"
                          strokeWidth={1.5}
                          className="transition-all duration-150 focus-visible:stroke-primary"
                          tabIndex={focusedDate === cell.date ? 0 : -1}
                          role="gridcell"
                          aria-label={accessibleLabel}
                          aria-current={isToday ? 'date' : undefined}
                          onKeyDown={(event) => handleCellKeyDown(event, cell.date)}
                          onMouseEnter={(event) => {
                            const bounds = overlayRef.current?.getBoundingClientRect()
                            if (!bounds) return
                            setTooltip({
                              x: event.clientX - bounds.left,
                              y: event.clientY - bounds.top - 12,
                              date: formattedDate,
                              value: cell.value,
                            })
                          }}
                          onFocus={(event) => {
                            setFocusedDate(cell.date)
                            const bounds = overlayRef.current?.getBoundingClientRect()
                            if (!bounds) return
                            const rect = event.currentTarget.getBoundingClientRect()
                            setTooltip({
                              x: rect.left - bounds.left + rect.width / 2,
                              y: rect.top - bounds.top - 8,
                              date: formattedDate,
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
                            stroke={todayOutlineColor}
                            strokeWidth={1.5}
                          />
                        )}
                      </g>
                    )
                  })}
                </g>
              ))}
            </svg>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-lg"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              <span className="font-medium">{config.formatter(tooltip.value)}</span>
              <span className="ml-1 text-muted-foreground">{tooltip.date}</span>
            </div>
          )}

          {/* Legend */}
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{t('charts.heatmap.less')}</span>
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((level, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-sm"
                style={{
                  backgroundColor: getColor(level * maxValue, maxValue, config.hue, isDarkTheme),
                }}
              />
            ))}
            <span>{t('charts.heatmap.more')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
