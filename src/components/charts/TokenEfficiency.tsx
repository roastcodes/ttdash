import { useMemo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { computeMovingAverage } from '@/lib/calculations'
import { CHART_HELP } from '@/lib/help-content'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import type { DailyUsage } from '@/types'

interface TokenEfficiencyProps {
  data: DailyUsage[]
}

export function TokenEfficiency({ data }: TokenEfficiencyProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')

  const { chartData, avg } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const effValues = sorted.map(d =>
      d.totalTokens > 0 ? d.totalCost / (d.totalTokens / 1_000_000) : 0
    )
    const ma7 = computeMovingAverage(effValues)
    const avg = effValues.length > 0
      ? effValues.reduce((s, v) => s + v, 0) / effValues.length
      : 0

    return {
      chartData: sorted.map((d, i) => ({
        date: d.date,
        efficiency: effValues[i],
        effMA7: ma7[i],
      })),
      avg,
    }
  }, [data])

  if (chartData.length < 3) return null

  return (
    <ChartCard
      title={t('charts.tokenEfficiency.title')}
      subtitle={t('charts.tokenEfficiency.subtitle', { value: formatCurrency(avg) })}
      info={CHART_HELP.tokenEfficiency}
      chartData={chartData as unknown as Record<string, unknown>[]}
      valueKey="efficiency"
      valueFormatter={formatCurrency}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line" delay={0.04}>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id={`${uid}-effGrad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.input} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.input} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(coerceNumber(value))} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
              <ReferenceLine y={avg} stroke={CHART_COLORS.axis} strokeDasharray="3 3" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="efficiency"
                stroke={CHART_COLORS.input}
                fill={`url(#${uid}-effGrad)`}
                strokeWidth={1.5}
                name={t('charts.tokenEfficiency.series')}
                dot={false}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION.duration}
              />
              <Line
                type="monotone"
                dataKey="effMA7"
                stroke={CHART_COLORS.ma7}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                name={t('charts.tokenEfficiency.movingAverage')}
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
