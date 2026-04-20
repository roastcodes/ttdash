import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from '@/components/charts/ChartCard'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import {
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getLineAnimationProps,
} from '@/components/charts/chart-theme'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { computeCurrentMonthForecast } from '@/lib/calculations'
import { MetricCard } from '@/components/cards/MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { TrendingUp } from 'lucide-react'
import { CHART_HELP } from '@/lib/help-content'
import type { DailyUsage, ViewMode } from '@/types'

interface CostForecastProps {
  data: DailyUsage[]
  forecastData?: DailyUsage[]
  viewMode?: ViewMode
  expandable?: boolean
}

/** Renders the current-month cost forecast card. */
export function CostForecast({
  data,
  forecastData,
  viewMode = 'daily',
  expandable = true,
}: CostForecastProps) {
  const { t } = useTranslation()
  const forecastInput = forecastData ?? data
  const {
    chartData,
    forecastTotal,
    currentMonthTotal,
    dailyAvgTrend,
    projectedDailyBurn,
    remainingDays,
    confidence,
    confidenceColor,
  } = useMemo(() => {
    const forecast = computeCurrentMonthForecast(forecastInput)

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

    const confidenceColor =
      confidence === 'high'
        ? 'text-green-400 bg-green-400/10'
        : confidence === 'medium'
          ? 'text-yellow-400 bg-yellow-400/10'
          : 'text-red-400 bg-red-400/10'

    const points: {
      date: string
      cost?: number
      forecast?: number
      lower?: number
      upper?: number
      band?: number
    }[] = []

    for (const point of elapsedCalendarSeries) {
      points.push({ date: point.date, cost: point.cost })
    }

    const lastActualCost = elapsedCalendarSeries[elapsedCalendarSeries.length - 1]?.cost ?? 0
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      if (lastPoint) {
        lastPoint.forecast = lastActualCost
        lastPoint.lower = Math.max(0, lastActualCost - volatility)
        lastPoint.upper = lastActualCost + volatility
        lastPoint.band = (lastPoint.upper ?? 0) - (lastPoint.lower ?? 0)
      }
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
  }, [forecastInput])

  // For monthly/yearly views, show a summary instead of a forecast
  if (viewMode !== 'daily') {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const total = sorted.reduce((s, d) => s + d.totalCost, 0)
    const avg = data.length > 0 ? total / data.length : 0

    if (data.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/80 p-6 text-center">
            <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">{t('forecast.noData')}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <MetricCard
          label={
            viewMode === 'monthly' ? t('forecast.avgMonthlyCost') : t('forecast.avgYearlyCost')
          }
          value={<FormattedValue value={avg} type="currency" />}
          subtitle={t('forecast.totalOverPeriods', {
            total: formatCurrency(total),
            count: data.length,
            unit: viewMode === 'monthly' ? t('periods.months') : t('periods.years'),
          })}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/80 p-6 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">{t('forecast.noForecast')}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{t('forecast.requiresTwoDays')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricCard
        label={
          <span className="flex items-center gap-2">
            {t('forecast.monthEndForecast')}{' '}
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${confidenceColor}`}
            >
              {t(`forecast.${confidence}`)}
            </span>
          </span>
        }
        value={<FormattedValue value={forecastTotal} type="currency" />}
        subtitle={`${t('forecast.soFar', { value: formatCurrency(currentMonthTotal) })} · ${t('forecast.remainingDays', { count: remainingDays })}${dailyAvgTrend ? ` · ${t('forecast.projectedPerDay', { value: formatCurrency(projectedDailyBurn) })}` : ''}`}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={
          dailyAvgTrend && dailyAvgTrend.change !== 0
            ? { value: dailyAvgTrend.change, label: t('forecast.vsLastWeek') }
            : null
        }
      />
      <ChartCard
        title={t('forecast.chartTitle')}
        subtitle={t('forecast.chartSubtitle')}
        summary={<FormattedValue value={forecastTotal} type="currency" />}
        info={CHART_HELP.forecast}
        expandable={expandable}
        chartData={chartData as unknown as Record<string, unknown>[]}
        valueKey="cost"
        valueFormatter={formatCurrency}
      >
        <ChartAnimationAware>
          {(animate) => (
            <ChartReveal variant="line">
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="forecast-cost-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateAxis}
                    stroke={CHART_COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => {
                      const numericValue = coerceNumber(value)
                      return numericValue === null ? '' : formatCurrency(numericValue)
                    }}
                    stroke={CHART_COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        formatter={(v) => formatCurrency(v)}
                        showComputedTotal={false}
                      />
                    }
                  />
                  <Legend content={<ChartLegend />} />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stackId="forecast-band"
                    stroke="none"
                    fill="transparent"
                    name={t('forecast.lowerBound')}
                  />
                  <Area
                    type="monotone"
                    dataKey="band"
                    stackId="forecast-band"
                    stroke="none"
                    fill={CHART_COLORS.cumulative}
                    fillOpacity={0.12}
                    name={t('forecast.uncertaintyBand')}
                    {...getAreaAnimationProps(animate, { role: 'stacked' })}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke={CHART_COLORS.cost}
                    fill="url(#forecast-cost-grad)"
                    name={t('forecast.actualCost')}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    {...getAreaAnimationProps(animate)}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke={CHART_COLORS.cumulative}
                    name={t('forecast.projection')}
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    connectNulls
                    {...getLineAnimationProps(animate, { role: 'secondary' })}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartReveal>
          )}
        </ChartAnimationAware>
      </ChartCard>
    </div>
  )
}
