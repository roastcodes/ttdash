import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DASHBOARD_MOTION, useDashboardElementMotion } from '@/components/dashboard/DashboardMotion'
import { InfoHeading } from '@/components/ui/info-heading'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatTokens, localToday } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import {
  buildHeatmapCellMap,
  buildHeatmapCellRows,
  buildHeatmapDayLabels,
  buildHeatmapGrid,
  getHeatmapColor as getColor,
  HEATMAP_CELL_SIZE as CELL_SIZE,
  HEATMAP_CELL_STAGGER_DAY_OFFSET_MS as CELL_STAGGER_DAY_OFFSET_MS,
  HEATMAP_CELL_STAGGER_WEEK_OFFSET_MS as CELL_STAGGER_WEEK_OFFSET_MS,
  HEATMAP_LEFT_GUTTER as LEFT_GUTTER,
  HEATMAP_TODAY_OUTLINE_EXTRA_DELAY_MS as TODAY_OUTLINE_EXTRA_DELAY_MS,
  HEATMAP_TOP_GUTTER as TOP_GUTTER,
  HEATMAP_TOTAL_CELL_SIZE as TOTAL,
  resolveHeatmapDefaultFocusedDate,
  resolveHeatmapKeyboardTarget,
} from '@/lib/heatmap-calendar-data'
import type { DailyUsage, ViewMode } from '@/types'

interface HeatmapCalendarProps {
  data: DailyUsage[]
  viewMode?: ViewMode
  metric?: 'cost' | 'requests' | 'tokens'
  isDark?: boolean
}

/** Renders a calendar heatmap for daily cost, request, or token activity. */
export function HeatmapCalendar({
  data,
  viewMode = 'daily',
  metric = 'cost',
  isDark = false,
}: HeatmapCalendarProps) {
  const { t } = useTranslation()
  const locale = getCurrentLocale()
  const cardRef = useRef<HTMLDivElement | null>(null)
  const dayButtonRefs = useRef(new Map<string, SVGRectElement>())
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    date: string
    value: number
  } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const heatmapMotion = useDashboardElementMotion(cardRef, {
    kind: 'chart',
    amount: 0.32,
  })
  const dayLabels = useMemo(() => buildHeatmapDayLabels(locale), [locale])
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
      hue: 215,
    },
    requests: {
      title: t('charts.heatmap.requestsTitle'),
      empty: t('charts.heatmap.requestsEmpty'),
      formatter: formatNumber,
      hue: 160,
    },
    tokens: {
      title: t('charts.heatmap.tokensTitle'),
      empty: t('charts.heatmap.tokensEmpty'),
      formatter: formatTokens,
      hue: 35,
    },
  }[metric]
  const infoText =
    metric === 'cost'
      ? CHART_HELP.heatmap
      : metric === 'requests'
        ? CHART_HELP.requestHeatmap
        : CHART_HELP.tokenHeatmap

  const { cells, weeks, months, maxValue } = useMemo(
    () => buildHeatmapGrid(data, metric, locale),
    [data, locale, metric],
  )

  const todayStr = localToday()
  const shouldReduceMotion = heatmapMotion.shouldReduceMotion
  const animateCells = !shouldReduceMotion && heatmapMotion.active
  const cellAnimationDelayMs = heatmapMotion.delayMs
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
  const cellRows = useMemo(() => buildHeatmapCellRows(cells), [cells])
  const cellByDate = useMemo(() => buildHeatmapCellMap(cells), [cells])
  const defaultFocusedDate = useMemo(
    () => resolveHeatmapDefaultFocusedDate(cells, todayStr),
    [cells, todayStr],
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
      const nextDate = resolveHeatmapKeyboardTarget(event.key, currentDate, cellRows, cellByDate)
      if (!nextDate) return

      event.preventDefault()
      focusDate(nextDate)
    },
    [cellByDate, cellRows, focusDate],
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
    <Card ref={cardRef} className="overflow-visible">
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
                    const cellMotionProps = shouldReduceMotion
                      ? {}
                      : {
                          initial: { opacity: 0, fillOpacity: 0, scale: 0.96 },
                          animate: {
                            opacity: animateCells ? 1 : 0,
                            fillOpacity: animateCells ? 1 : 0,
                            scale: animateCells ? 1 : 0.96,
                          },
                          transition: {
                            duration: 0.28,
                            delay:
                              (animateCells
                                ? cellAnimationDelayMs +
                                  cell.week *
                                    (DASHBOARD_MOTION.itemStaggerMs + CELL_STAGGER_WEEK_OFFSET_MS) +
                                  cell.day * CELL_STAGGER_DAY_OFFSET_MS
                                : 0) / 1000,
                            ease: [0.22, 1, 0.36, 1] as const,
                          },
                        }
                    const todayOutlineMotionProps = shouldReduceMotion
                      ? {}
                      : {
                          initial: { opacity: 0 },
                          animate: { opacity: animateCells ? 1 : 0 },
                          transition: {
                            duration: 0.2,
                            delay:
                              (animateCells
                                ? cellAnimationDelayMs +
                                  cell.week *
                                    (DASHBOARD_MOTION.itemStaggerMs + CELL_STAGGER_WEEK_OFFSET_MS) +
                                  cell.day * CELL_STAGGER_DAY_OFFSET_MS +
                                  TODAY_OUTLINE_EXTRA_DELAY_MS
                                : 0) / 1000,
                            ease: [0.22, 1, 0.36, 1] as const,
                          },
                        }

                    return (
                      <g key={cell.date}>
                        <motion.rect
                          ref={(node) => {
                            if (node) dayButtonRefs.current.set(cell.date, node)
                            else dayButtonRefs.current.delete(cell.date)
                          }}
                          x={LEFT_GUTTER + cell.week * TOTAL}
                          y={TOP_GUTTER + cell.day * TOTAL}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={2}
                          fill={getColor(cell.value, maxValue, config.hue, isDark)}
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
                          {...cellMotionProps}
                        >
                          <title>{accessibleLabel}</title>
                        </motion.rect>
                        {isToday && (
                          <motion.rect
                            x={LEFT_GUTTER + cell.week * TOTAL - 1}
                            y={TOP_GUTTER + cell.day * TOTAL - 1}
                            width={CELL_SIZE + 2}
                            height={CELL_SIZE + 2}
                            rx={3}
                            fill="none"
                            stroke={todayOutlineColor}
                            strokeWidth={1.5}
                            {...todayOutlineMotionProps}
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
                  backgroundColor: getColor(level * maxValue, maxValue, config.hue, isDark),
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
