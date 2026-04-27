import { useId, useMemo } from 'react'
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
} from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import {
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getLineAnimationProps,
} from './chart-theme'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { ChartDataPoint, CurrentMonthForecast } from '@/types'

interface CumulativeCostProps {
  data: ChartDataPoint[]
  forecast: CurrentMonthForecast | null
}

type CumulativeChartPoint = ChartDataPoint & {
  projected?: number | undefined
}

/** Renders cumulative cost with the optional month-end projection. */
export function CumulativeCost({ data, forecast }: CumulativeCostProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')

  // Add projected end-of-month line
  const chartData = useMemo<CumulativeChartPoint[]>(() => {
    if (data.length < 3) return data
    const last = data[data.length - 1]
    if (!last?.date || last.cumulative == null) return data
    if (!forecast) return data

    const { currentMonth, daysInMonth, forecastTotal } = forecast
    if (last.date.length !== 10 || !last.date.startsWith(currentMonth)) return data

    // Only project if not already end of month
    if (forecast.elapsedDays >= daysInMonth) return data

    const visibleCurrentMonthActual = data.reduce((sum, point) => {
      if (point.date.length !== 10 || !point.date.startsWith(currentMonth)) return sum
      return sum + point.cost
    }, 0)
    const projectedIncrement = Math.max(0, forecastTotal - visibleCurrentMonthActual)
    if (projectedIncrement <= 0) return data

    const endDate = `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`
    const bridgePoint: CumulativeChartPoint = { ...last, projected: last.cumulative }
    const projectedPoint: CumulativeChartPoint = {
      date: endDate,
      projected: last.cumulative + projectedIncrement,
      cost: 0,
      ma7: 0,
    }

    return [...data, bridgePoint, projectedPoint]
  }, [data, forecast])

  const lastCumulative = data[data.length - 1]?.cumulative ?? 0

  return (
    <ChartCard
      title={t('charts.cumulativeCost.title')}
      subtitle={t('charts.cumulativeCost.total', { value: formatCurrency(lastCumulative) })}
      info={CHART_HELP.cumulativeCost}
      chartData={data}
      valueKey="cumulative"
      valueFormatter={formatCurrency}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id={`${uid}-cumulGrad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.cumulative} stopOpacity={0.4} />
                    <stop offset="60%" stopColor={CHART_COLORS.cumulative} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={CHART_COLORS.cumulative} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
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
                  content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={CHART_COLORS.cumulative}
                  fill={`url(#${uid}-cumulGrad)`}
                  name={t('charts.cumulativeCost.cumulative')}
                  strokeWidth={2}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: CHART_COLORS.cumulative,
                    fill: 'hsl(var(--background))',
                  }}
                  dot={false}
                  {...getAreaAnimationProps(animate)}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke={CHART_COLORS.cumulative}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name={t('charts.cumulativeCost.projection')}
                  connectNulls
                  {...getLineAnimationProps(animate, { role: 'secondary' })}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartReveal>
        )}
      </ChartAnimationAware>
    </ChartCard>
  )
}
