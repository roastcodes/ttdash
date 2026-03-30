import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { getModelColor } from '@/lib/model-utils'
import { formatCurrency } from '@/lib/formatters'

interface CostByModelProps {
  data: { name: string; value: number }[]
}

export function CostByModel({ data }: CostByModelProps) {
  return (
    <ChartCard title="Kosten nach Modell">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={getModelColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
          <Legend
            formatter={(value: string) => {
              const entry = data.find(d => d.name === value)
              return <span className="text-xs text-foreground">{value} ({entry ? formatCurrency(entry.value) : ''})</span>
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
