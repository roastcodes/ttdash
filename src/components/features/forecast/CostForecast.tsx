import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from '@/components/charts/ChartCard'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from '@/components/charts/chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import { computeCurrentMonthForecast } from '@/lib/calculations'
import { MetricCard } from '@/components/cards/MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { TrendingUp } from 'lucide-react'
import { CHART_HELP } from '@/lib/help-content'
import type { DailyUsage, ViewMode } from '@/types'

interface CostForecastProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

export function CostForecast({ data, viewMode = 'daily' }: CostForecastProps) {
  // For monthly/yearly views, show a summary instead of a forecast
  if (viewMode !== 'daily') {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const total = sorted.reduce((s, d) => s + d.totalCost, 0)
    const avg = data.length > 0 ? total / data.length : 0

    if (data.length === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/80 p-6 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Keine Daten verfügbar</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <MetricCard
          label={viewMode === 'monthly' ? 'Ø Monatskosten' : 'Ø Jahreskosten'}
          value={<FormattedValue value={avg} type="currency" />}
          subtitle={`Gesamt: ${formatCurrency(total)} über ${data.length} ${viewMode === 'monthly' ? 'Monate' : 'Jahre'}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
    )
  }

  // Daily view: full forecast with chart
  const { chartData, forecastTotal, currentMonthTotal, monthData, dailyAvgTrend, projectedDailyBurn, remainingDays, confidence, confidenceColor } = useMemo(() => {
    const forecast = computeCurrentMonthForecast(data)

    if (!forecast) {
      return {
        chartData: [],
        forecastTotal: 0,
        currentMonthTotal: 0,
        monthData: [],
        dailyAvgTrend: null,
        projectedDailyBurn: 0,
        remainingDays: 0,
        confidence: 'niedrig',
        confidenceColor: 'text-red-400 bg-red-400/10',
      }
    }

    const {
      currentMonth,
      currentMonthTotal,
      monthData,
      remainingDays,
      projectedDailyBurn,
      volatility,
      lowerDaily,
      upperDaily,
      forecastTotal,
      dailyAvgTrend,
      confidence,
      elapsedCalendarSeries,
      daysInMonth,
    } = forecast

    const confidenceColor = confidence === 'hoch'
      ? 'text-green-400 bg-green-400/10'
      : confidence === 'mittel'
        ? 'text-yellow-400 bg-yellow-400/10'
        : 'text-red-400 bg-red-400/10'

    // Build chart data: actual + forecast
    const points: { date: string; cost?: number; forecast?: number; lower?: number; upper?: number; band?: number }[] = []

    // Actual data points
    for (const point of elapsedCalendarSeries) {
      points.push({ date: point.date, cost: point.cost })
    }

    // Bridge point: last actual day also gets forecast+upper so the lines connect
    const lastActualCost = elapsedCalendarSeries[elapsedCalendarSeries.length - 1]?.cost ?? 0
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      lastPoint.forecast = lastActualCost
      lastPoint.lower = Math.max(0, lastActualCost - volatility)
      lastPoint.upper = lastActualCost + volatility
      lastPoint.band = (lastPoint.upper ?? 0) - (lastPoint.lower ?? 0)
    }

    // Forecast to end of month
    for (let day = elapsedCalendarSeries.length + 1; day <= daysInMonth; day++) {
      const forecastDate = `${currentMonth}-${String(day).padStart(2, '0')}`
      points.push({
        date: forecastDate,
        forecast: projectedDailyBurn,
        lower: lowerDaily,
        upper: upperDaily,
        band: upperDaily - lowerDaily,
      })
    }

    return {
      chartData: points,
      forecastTotal,
      currentMonthTotal,
      monthData,
      dailyAvgTrend,
      projectedDailyBurn,
      remainingDays,
      confidence,
      confidenceColor,
    }
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card/80 p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Keine Prognose verfügbar</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Mindestens 2 Tage mit Daten benötigt
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricCard
        label={<span className="flex items-center gap-2">Prognose Monatsende <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${confidenceColor}`}>{confidence}</span></span>}
        value={<>~<FormattedValue value={forecastTotal} type="currency" /></>}
        subtitle={`Bisher: ${formatCurrency(currentMonthTotal)} · Resttage: ${remainingDays}${dailyAvgTrend ? ` · Prognose ${formatCurrency(projectedDailyBurn)}/Tag` : ''}`}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={dailyAvgTrend && dailyAvgTrend.change !== 0 ? { value: dailyAvgTrend.change, label: 'vs. Vorwoche' } : null}
      />
      <ChartCard
        title="Kostenprognose aktueller Monat"
        subtitle="Monatsend-Prognose auf Basis geglätteter Kalender-Tageskosten"
        summary={<FormattedValue value={forecastTotal} type="currency" />}
        info={CHART_HELP.forecast}
        chartData={chartData as unknown as Record<string, unknown>[]}
        valueKey="cost"
        valueFormatter={formatCurrency}
      >
        <ChartAnimationAware>
          {(animate) => (
            <ChartReveal variant="line" delay={0.05}>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="forecast-cost-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend />
                <Area type="monotone" dataKey="lower" stackId="forecast-band" stroke="none" fill="transparent" name="Untere Spanne" />
                <Area type="monotone" dataKey="band" stackId="forecast-band" stroke="none" fill={CHART_COLORS.cumulative} fillOpacity={0.12} name="Unsicherheitsband" isAnimationActive={animate} animationBegin={CHART_ANIMATION.stagger} animationDuration={CHART_ANIMATION.duration} />
                <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} fill="url(#forecast-cost-grad)" name="Ist-Kosten" strokeWidth={2} dot={false} connectNulls isAnimationActive={animate} animationBegin={0} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
                <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.cumulative} name="Prognose" dot={false} strokeWidth={2} strokeDasharray="6 3" connectNulls isAnimationActive={animate} animationBegin={CHART_ANIMATION.stagger * 2} animationDuration={CHART_ANIMATION.slowDuration} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartReveal>
          )}
        </ChartAnimationAware>
      </ChartCard>
    </div>
  )
}
