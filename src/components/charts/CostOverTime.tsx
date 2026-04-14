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
  Legend,
} from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { ChartDataPoint } from '@/types'

interface CostOverTimeProps {
  data: ChartDataPoint[]
  onClickDay?: (date: string) => void
}

export function CostOverTime({ data, onClickDay }: CostOverTimeProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')
  const summary = useMemo(() => {
    if (data.length === 0) return null
    const latest = data[data.length - 1]
    let peak = data[0]
    for (let index = 1; index < data.length; index += 1) {
      const candidate = data[index]
      if (candidate && peak && candidate.cost > peak.cost) {
        peak = candidate
      }
    }
    if (!latest || !peak) return null
    return {
      latest: latest.cost,
      peak: peak.cost,
      peakDate: peak.date,
    }
  }, [data])

  return (
    <ChartCard
      title={t('charts.costOverTime.title')}
      subtitle={
        summary
          ? t('charts.costOverTime.summary', {
              latest: formatCurrency(summary.latest),
              peak: formatCurrency(summary.peak),
              date: formatDateAxis(summary.peakDate),
            })
          : t('charts.costOverTime.subtitle')
      }
      info={CHART_HELP.costOverTime}
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="cost"
      valueFormatter={formatCurrency}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={data}
                margin={CHART_MARGIN}
                onClick={(e) => {
                  if (
                    onClickDay &&
                    e?.activeTooltipIndex != null &&
                    typeof e.activeTooltipIndex === 'number'
                  ) {
                    const point = data[e.activeTooltipIndex]
                    if (point?.date) {
                      onClickDay(point.date)
                    }
                  }
                }}
              >
                <defs>
                  <linearGradient id={`${uid}-gradCostLine`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
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
                <Legend content={<ChartLegend />} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke={CHART_COLORS.cost}
                  fill={`url(#${uid}-gradCostLine)`}
                  name={t('charts.costOverTime.cost')}
                  strokeWidth={1.5}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: CHART_COLORS.cost,
                    fill: 'hsl(var(--background))',
                  }}
                  dot={false}
                  isAnimationActive={animate}
                  animationBegin={0}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
                <Line
                  type="monotone"
                  dataKey="ma7"
                  stroke={CHART_COLORS.ma7}
                  name={t('charts.costOverTime.movingAverage')}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="5 5"
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
