import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from './chart-theme'
import { formatCurrency } from '@/lib/formatters'
import type { WeekdayData } from '@/types'

interface CostByWeekdayProps {
  data: WeekdayData[]
}

export function CostByWeekday({ data }: CostByWeekdayProps) {
  return (
    <ChartCard title="Kosten nach Wochentag">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="day" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
          <Bar dataKey="cost" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} name="Ø Kosten" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
