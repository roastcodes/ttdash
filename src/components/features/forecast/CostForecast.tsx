import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard } from '@/components/charts/ChartCard'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from '@/components/charts/chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import { linearRegression } from '@/lib/calculations'
import { MetricCard } from '@/components/cards/MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { TrendingUp } from 'lucide-react'
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
          subtitle={`Total: ${formatCurrency(total)} über ${data.length} ${viewMode === 'monthly' ? 'Monate' : 'Jahre'}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
    )
  }

  // Daily view: full forecast with chart
  const { chartData, forecastTotal, currentMonthTotal, monthData, dailyAvgTrend } = useMemo(() => {
    if (data.length < 3) return { chartData: [], forecastTotal: 0, currentMonthTotal: 0, monthData: [], dailyAvgTrend: null }

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
    const currentMonth = sorted[sorted.length - 1].date.slice(0, 7)

    // Get current month data
    const monthData = sorted.filter(d => d.date.startsWith(currentMonth))
    const monthTotal = monthData.reduce((s, d) => s + d.totalCost, 0)

    // Compute daily average trend: last 7 days vs previous 7 days
    const last7 = sorted.slice(-Math.min(7, sorted.length))
    const prev7 = sorted.length > 7 ? sorted.slice(-Math.min(14, sorted.length), -7) : []
    const last7Avg = last7.length > 0 ? last7.reduce((s, d) => s + d.totalCost, 0) / last7.length : 0
    const prev7Avg = prev7.length > 0 ? prev7.reduce((s, d) => s + d.totalCost, 0) / prev7.length : 0
    const dailyAvgTrend = prev7Avg > 0
      ? { avg: last7Avg, change: ((last7Avg - prev7Avg) / prev7Avg) * 100 }
      : { avg: last7Avg, change: 0 }

    // Use last 30 days for regression
    const recentData = sorted.slice(-Math.min(30, sorted.length))
    const costs = recentData.map(d => d.totalCost)
    const { slope, intercept } = linearRegression(costs)

    // Calculate std dev for confidence band
    const predictions = costs.map((_, i) => slope * i + intercept)
    const residuals = costs.map((c, i) => c - predictions[i])
    const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / costs.length)

    // Build chart data: actual + forecast
    const points: { date: string; cost?: number; forecast?: number; upper?: number }[] = []

    // Actual data points
    for (const d of monthData) {
      points.push({ date: d.date, cost: d.totalCost })
    }

    // Bridge point: last actual day also gets forecast+upper so the lines connect
    const lastActualCost = monthData[monthData.length - 1]?.totalCost ?? 0
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      lastPoint.forecast = lastActualCost
      lastPoint.upper = Math.max(0, lastActualCost + stdDev)
    }

    // Forecast to end of month
    const daysInMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0).getDate()
    const lastDayNum = lastDate.getDate()
    const baseIndex = recentData.length - 1

    let runningForecast = monthTotal
    for (let day = lastDayNum + 1; day <= daysInMonth; day++) {
      const forecastDate = `${currentMonth}-${String(day).padStart(2, '0')}`
      const idx = baseIndex + (day - lastDayNum)
      const predicted = Math.max(0, slope * idx + intercept)
      runningForecast += predicted
      points.push({
        date: forecastDate,
        forecast: predicted,
        upper: Math.max(0, predicted + stdDev),
      })
    }

    return { chartData: points, forecastTotal: runningForecast, currentMonthTotal: monthTotal, monthData, dailyAvgTrend }
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card/80 p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Keine Prognose verfügbar</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Mindestens 3 Tage mit Daten benötigt
          </p>
        </div>
      </div>
    )
  }

  const confidence = monthData.length >= 14 ? 'hoch' : monthData.length >= 7 ? 'mittel' : 'niedrig'
  const confidenceColor = confidence === 'hoch' ? 'text-green-400 bg-green-400/10' : confidence === 'mittel' ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'

  return (
    <div className="space-y-4">
      <MetricCard
        label={<span className="flex items-center gap-2">Prognose Monatsende <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${confidenceColor}`}>{confidence}</span></span>}
        value={<>~<FormattedValue value={forecastTotal} type="currency" /></>}
        subtitle={`Bisher: ${formatCurrency(currentMonthTotal)}${dailyAvgTrend ? ` · Ø ${formatCurrency(dailyAvgTrend.avg)}/Tag` : ''}`}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={dailyAvgTrend && dailyAvgTrend.change !== 0 ? { value: dailyAvgTrend.change, label: 'vs. Vorwoche' } : null}
      />
      <ChartCard
        title="Kostenprognose aktueller Monat"
        summary={<FormattedValue value={forecastTotal} type="currency" />}
        chartData={chartData as unknown as Record<string, unknown>[]}
        valueKey="cost"
        valueFormatter={formatCurrency}
      >
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
            {/* Confidence band */}
            <Area type="monotone" dataKey="upper" stroke="none" fill={CHART_COLORS.cumulative} fillOpacity={0.12} name="Konfidenzband" />
            {/* Actual cost area with gradient fill */}
            <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} fill="url(#forecast-cost-grad)" name="Ist-Kosten" strokeWidth={2} dot={false} connectNulls />
            {/* Forecast dashed line */}
            <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.cumulative} name="Prognose" dot={false} strokeWidth={2} strokeDasharray="6 3" connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
