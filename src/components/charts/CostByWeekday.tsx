import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useState, useId } from 'react'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { formatCurrency } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { WeekdayData } from '@/types'

interface CostByWeekdayProps {
  data: WeekdayData[]
}

export function CostByWeekday({ data }: CostByWeekdayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const uid = useId()
  const gid = (n: string) => `${uid}-${n}`.replace(/:/g, '')

  return (
    <ChartCard title="Kosten nach Wochentag" subtitle="Durchschnittliche Kosten pro Wochentag" info={CHART_HELP.costByWeekday} chartData={data as unknown as Record<string, unknown>[]} valueKey="cost" valueFormatter={formatCurrency}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={CHART_MARGIN}
          onMouseMove={(state) => {
            if (state?.activeTooltipIndex !== undefined) {
              setActiveIndex(state.activeTooltipIndex)
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gid('weekday')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.9} />
              <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id={gid('weekdayActive')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={1} />
              <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="day" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
          />
          <Bar
            dataKey="cost"
            radius={[4, 4, 0, 0]}
            name="Ø Kosten"
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={activeIndex === index ? `url(#${gid('weekdayActive')})` : `url(#${gid('weekday')})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
