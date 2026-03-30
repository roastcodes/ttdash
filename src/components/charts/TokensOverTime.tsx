import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from './chart-theme'
import { formatTokens, formatDateAxis } from '@/lib/formatters'
import type { TokenChartDataPoint } from '@/types'

interface TokensOverTimeProps {
  data: TokenChartDataPoint[]
}

export function TokensOverTime({ data }: TokensOverTimeProps) {
  return (
    <ChartCard title="Tokens im Zeitverlauf + 7-Tage Ø" className="lg:col-span-2">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="cacheReadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.cacheRead} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.cacheRead} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatTokens(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatTokens(v)} />} />
          <Legend />
          <Area type="monotone" dataKey="Cache Read" stackId="1" stroke={CHART_COLORS.cacheRead} fill="url(#cacheReadGrad)" />
          <Area type="monotone" dataKey="Cache Write" stackId="1" stroke={CHART_COLORS.cacheWrite} fill={CHART_COLORS.cacheWrite} fillOpacity={0.2} />
          <Area type="monotone" dataKey="Output" stackId="1" stroke={CHART_COLORS.output} fill={CHART_COLORS.output} fillOpacity={0.3} />
          <Area type="monotone" dataKey="Input" stackId="1" stroke={CHART_COLORS.input} fill={CHART_COLORS.input} fillOpacity={0.3} />
          <Line type="monotone" dataKey="tokenMA7" stroke={CHART_COLORS.ma7} name="7-Tage Ø" dot={false} strokeWidth={2} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
