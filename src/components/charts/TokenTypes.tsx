import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS } from './chart-theme'
import { formatTokens } from '@/lib/formatters'

const TOKEN_COLORS: Record<string, string> = {
  'Input': CHART_COLORS.input,
  'Output': CHART_COLORS.output,
  'Cache Write': CHART_COLORS.cacheWrite,
  'Cache Read': CHART_COLORS.cacheRead,
}

interface TokenTypesProps {
  data: { name: string; value: number }[]
}

export function TokenTypes({ data }: TokenTypesProps) {
  return (
    <ChartCard title="Token-Typen">
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
              <Cell key={entry.name} fill={TOKEN_COLORS[entry.name] ?? CHART_COLORS.cost} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(v) => formatTokens(v)} />} />
          <Legend
            formatter={(value: string) => {
              const entry = data.find(d => d.name === value)
              return <span className="text-xs text-foreground">{value} ({entry ? formatTokens(entry.value) : ''})</span>
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
