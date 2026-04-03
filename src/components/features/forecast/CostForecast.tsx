import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { chartData, forecastTotal, currentMonthTotal, dailyAvgTrend, projectedDailyBurn, remainingDays, confidence, confidenceColor } = useMemo(() => {
    const forecast = computeCurrentMonthForecast(data)

    if (!forecast) {
      return {
        chartData: [],
        forecastTotal: 0,
        currentMonthTotal: 0,
        dailyAvgTrend: null,
        projectedDailyBurn: 0,
        remainingDays: 0,
        confidence: 'low',
        confidenceColor: 'text-red-400 bg-red-400/10',
      }
    }

    const {
      currentMonth,
      currentMonthTotal,
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

    const confidenceColor = confidence === 'high'
      ? 'text-green-400 bg-green-400/10'
      : confidence === 'medium'
        ? 'text-yellow-400 bg-yellow-400/10'
        : 'text-red-400 bg-red-400/10'

    const points: { date: string; cost?: number; forecast?: number; lower?: number; upper?: number; band?: number }[] = []

    for (const point of elapsedCalendarSeries) {
      points.push({ date: point.date, cost: point.cost })
    }

    const lastActualCost = elapsedCalendarSeries[elapsedCalendarSeries.length - 1]?.cost ?? 0
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      lastPoint.forecast = lastActualCost
      lastPoint.lower = Math.max(0, lastActualCost - volatility)
      lastPoint.upper = lastActualCost + volatility
      lastPoint.band = (lastPoint.upper ?? 0) - (lastPoint.lower ?? 0)
    }

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
      dailyAvgTrend,
      projectedDailyBurn,
      remainingDays,
      confidence,
      confidenceColor,
    }
  }, [data])

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
            <p className="text-sm text-muted-foreground font-medium">{t('forecast.noData')}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <MetricCard
          label={viewMode === 'monthly' ? t('forecast.avgMonthlyCost') : t('forecast.avgYearlyCost')}
          value={<FormattedValue value={avg} type="currency" />}
          subtitle={t('forecast.totalOverPeriods', { total: formatCurrency(total), count: data.length, unit: viewMode === 'monthly' ? t('periods.months') : t('periods.years') })}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-card/80 p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">{t('forecast.noForecast')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {t('forecast.requiresTwoDays')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricCard
        label={<span className="flex items-center gap-2">{t('forecast.monthEndForecast')} <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${confidenceColor}`}>{t(`forecast.${confidence}`)}</span></span>}
        value={<>~<FormattedValue value={forecastTotal} type="currency" /></>}
        subtitle={`${t('forecast.soFar', { value: formatCurrency(currentMonthTotal) })} · ${t('forecast.remainingDays', { count: remainingDays })}${dailyAvgTrend ? ` · ${t('forecast.projectedPerDay', { value: formatCurrency(projectedDailyBurn) })}` : ''}`}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={dailyAvgTrend && dailyAvgTrend.change !== 0 ? { value: dailyAvgTrend.change, label: t('forecast.vsLastWeek') } : null}
      />
      <ChartCard
        title={t('forecast.chartTitle')}
        subtitle={t('forecast.chartSubtitle')}
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
                <Area type="monotone" dataKey="lower" stackId="forecast-band" stroke="none" fill="transparent" name={t('forecast.lowerBound')} />
                <Area type="monotone" dataKey="band" stackId="forecast-band" stroke="none" fill={CHART_COLORS.cumulative} fillOpacity={0.12} name={t('forecast.uncertaintyBand')} isAnimationActive={animate} animationBegin={CHART_ANIMATION.stagger} animationDuration={CHART_ANIMATION.duration} />
                <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} fill="url(#forecast-cost-grad)" name={t('forecast.actualCost')} strokeWidth={2} dot={false} connectNulls isAnimationActive={animate} animationBegin={0} animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
                <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.cumulative} name={t('forecast.projection')} dot={false} strokeWidth={2} strokeDasharray="6 3" connectNulls isAnimationActive={animate} animationBegin={CHART_ANIMATION.stagger * 2} animationDuration={CHART_ANIMATION.slowDuration} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartReveal>
          )}
        </ChartAnimationAware>
      </ChartCard>
    </div>
  )
}
