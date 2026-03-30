import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from './chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import type { ChartDataPoint } from '@/types'

interface CumulativeCostProps {
  data: ChartDataPoint[]
}

export function CumulativeCost({ data }: CumulativeCostProps) {
  return (
    <ChartCard title="Kumulative Kosten">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.cumulative} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.cumulative} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
          <Area type="monotone" dataKey="cumulative" stroke={CHART_COLORS.cumulative} fill="url(#cumulGrad)" name="Kumulativ" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
