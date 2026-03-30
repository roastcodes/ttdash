import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_ANIMATION } from './chart-theme'
import { formatTokens } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'

const TOKEN_COLORS: Record<string, string> = {
  'Input': CHART_COLORS.input,
  'Output': CHART_COLORS.output,
  'Cache Write': CHART_COLORS.cacheWrite,
  'Cache Read': CHART_COLORS.cacheRead,
}

interface TokenTypesProps {
  data: { name: string; value: number }[]
}

function CenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: string }) {
  if (!viewBox) return null
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        Total
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-foreground" fontSize={16} fontWeight={600}>
        {total}
      </text>
    </g>
  )
}

export function TokenTypes({ data }: TokenTypesProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ChartCard title="Token-Typen" subtitle="Verteilung der Token-Typen" info={CHART_HELP.tokenTypes} chartData={data as unknown as Record<string, unknown>[]} valueKey="value" valueFormatter={formatTokens}>
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
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={TOKEN_COLORS[entry.name] ?? CHART_COLORS.cost} />
            ))}
            <CenterLabel total={formatTokens(total)} />
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(v) => formatTokens(v)} />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
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
