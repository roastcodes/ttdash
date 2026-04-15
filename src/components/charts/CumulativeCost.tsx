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
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { computeCurrentMonthForecast } from '@/lib/calculations'
import { CHART_HELP } from '@/lib/help-content'
import type { ChartDataPoint, DailyUsage } from '@/types'

interface CumulativeCostProps {
  data: ChartDataPoint[]
  rawData: DailyUsage[]
}

/** Renders cumulative cost with the optional month-end projection. */
export function CumulativeCost({ data, rawData }: CumulativeCostProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')

  // Add projected end-of-month line
  const chartData = useMemo(() => {
    if (data.length < 3) return data
    const last = data[data.length - 1]
    if (!last?.date || !last.cumulative) return data
    const forecast = computeCurrentMonthForecast(rawData)
    if (!forecast) return data

    const { currentMonth, daysInMonth, projectedDailyBurn } = forecast
    const dayNum = forecast.elapsedDays

    // Only project if not already end of month
    if (dayNum >= daysInMonth) return data

    const projected = last.cumulative + projectedDailyBurn * (daysInMonth - dayNum)
    const endDate = `${currentMonth}-${String(daysInMonth).padStart(2, '0')}`

    return [
      ...data.map((d) => ({ ...d, projected: undefined as number | undefined })),
      // Bridge point on last actual date
      { ...data[data.length - 1], projected: last.cumulative },
      // Projected end-of-month point
      { date: endDate, cumulative: undefined as number | undefined, projected, cost: 0, ma7: 0 },
    ]
  }, [data, rawData])

  const lastCumulative = data[data.length - 1]?.cumulative ?? 0

  return (
    <ChartCard
      title={t('charts.cumulativeCost.title')}
      subtitle={t('charts.cumulativeCost.total', { value: formatCurrency(lastCumulative) })}
      info={CHART_HELP.cumulativeCost}
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="cumulative"
      valueFormatter={formatCurrency}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData as Record<string, unknown>[]} margin={CHART_MARGIN}>
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
                  isAnimationActive={animate}
                  animationBegin={0}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
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
                  isAnimationActive={animate}
                  animationBegin={CHART_ANIMATION.stagger}
                  animationDuration={CHART_ANIMATION.slowDuration}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartReveal>
        )}
      </ChartAnimationAware>
    </ChartCard>
  )
}
