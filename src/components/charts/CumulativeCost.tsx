import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { ChartDataPoint } from '@/types'

interface CumulativeCostProps {
  data: ChartDataPoint[]
}

export function CumulativeCost({ data }: CumulativeCostProps) {
  const uid = useId().replace(/:/g, '')
  return (
    <ChartCard title="Kumulative Kosten" subtitle="Kumulierte Ausgaben über den Zeitraum" info={CHART_HELP.cumulativeCost} chartData={data as unknown as Record<string, unknown>[]} valueKey="cumulative" valueFormatter={formatCurrency}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={`${uid}-cumulGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cumulative} stopOpacity={0.4} />
              <stop offset="60%" stopColor={CHART_COLORS.cumulative} stopOpacity={0.1} />
              <stop offset="100%" stopColor={CHART_COLORS.cumulative} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={CHART_COLORS.cumulative}
            fill={`url(#${uid}-cumulGrad)`}
            name="Kumulativ"
            strokeWidth={2}
            activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_COLORS.cumulative, fill: 'hsl(var(--background))' }}
            dot={false}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
