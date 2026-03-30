import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from './chart-theme'
import { getModelColor } from '@/lib/model-utils'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import type { ChartDataPoint } from '@/types'

interface CostByModelOverTimeProps {
  data: (ChartDataPoint & Record<string, number>)[]
  models: string[]
}

export function CostByModelOverTime({ data, models }: CostByModelOverTimeProps) {
  return (
    <ChartCard title="Kosten nach Modell im Zeitverlauf + 7-Tage Ø" className="lg:col-span-2">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
          <Legend />
          {models.map(model => (
            <Area
              key={model}
              type="monotone"
              dataKey={model}
              stackId="1"
              stroke={getModelColor(model)}
              fill={getModelColor(model)}
              fillOpacity={0.3}
              name={model}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
