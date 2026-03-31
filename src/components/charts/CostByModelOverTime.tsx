import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { getModelColor } from '@/lib/model-utils'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { ChartDataPoint } from '@/types'

interface CostByModelOverTimeProps {
  data: (ChartDataPoint & Record<string, number>)[]
  models: string[]
}

export function CostByModelOverTime({ data, models }: CostByModelOverTimeProps) {
  // Expanded extra: taller chart with per-model 7-day MA lines
  const expandedChart = (
    <div className="mt-6">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">7-Tage Durchschnitt pro Modell</div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
            cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
          />
          <Legend />
          {models.map(model => (
            <Line
              key={`${model}_ma7`}
              type="monotone"
              dataKey={`${model}_ma7`}
              stroke={getModelColor(model)}
              name={`${model} Ø`}
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <ChartCard
      title="Kosten nach Modell im Zeitverlauf"
      subtitle="Pro Modell über die Zeit"
      info={CHART_HELP.costByModelOverTime}
      className="lg:col-span-2"
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="cost"
      valueFormatter={formatCurrency}
      expandedExtra={expandedChart}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
            cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
          />
          <Legend />
          {models.map(model => (
            <Line
              key={model}
              type="monotone"
              dataKey={model}
              stroke={getModelColor(model)}
              name={model}
              dot={false}
              strokeWidth={1.5}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
