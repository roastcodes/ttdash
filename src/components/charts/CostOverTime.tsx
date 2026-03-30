import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from './chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import type { ChartDataPoint } from '@/types'

interface CostOverTimeProps {
  data: ChartDataPoint[]
  onClickDay?: (date: string) => void
}

export function CostOverTime({ data, onClickDay }: CostOverTimeProps) {
  return (
    <ChartCard title="Kosten im Zeitverlauf + 7-Tage Ø">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={CHART_MARGIN} onClick={(e) => {
          if (e?.activePayload?.[0]?.payload?.date && onClickDay) {
            onClickDay(e.activePayload[0].payload.date)
          }
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
          <Legend />
          <Line type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} name="Kosten" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="ma7" stroke={CHART_COLORS.ma7} name="7-Tage Ø" dot={false} strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
