import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { getModelColor, normalizeModelName } from '@/lib/model-utils'
import { formatDateAxis, formatPercent } from '@/lib/formatters'
import type { DailyUsage } from '@/types'

interface ModelMixProps {
  data: DailyUsage[]
}

interface MixTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function MixTooltip({ active, payload, label }: MixTooltipProps) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="bg-popover/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        {sorted.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground ml-auto">{formatPercent(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ModelMix({ data }: ModelMixProps) {
  const { chartData, models } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const modelSet = new Set<string>()
    for (const d of sorted) {
      for (const mb of d.modelBreakdowns) modelSet.add(normalizeModelName(mb.modelName))
    }
    const models = Array.from(modelSet).sort()

    const chartData = sorted.map(d => {
      const total = d.totalCost
      const point: Record<string, unknown> = { date: d.date }
      const costs: Record<string, number> = {}
      for (const mb of d.modelBreakdowns) {
        const name = normalizeModelName(mb.modelName)
        costs[name] = (costs[name] ?? 0) + mb.cost
      }
      for (const name of models) {
        point[name] = total > 0 ? ((costs[name] ?? 0) / total) * 100 : 0
      }
      return point
    })

    return { chartData, models }
  }, [data])

  if (chartData.length < 3 || models.length < 2) return null

  return (
    <ChartCard
      title="Modell-Mix"
      subtitle="Kostenanteil pro Modell über die Zeit"
      info={CHART_HELP.modelMix}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line" delay={0.05}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={CHART_MARGIN} stackOffset="none">
          <defs>
            {models.map(model => {
              const color = getModelColor(model)
              const id = `mix-grad-${model.replace(/[\s.]/g, '-')}`
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.45} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
          <YAxis tickFormatter={(v) => `${Math.round(v)}%`} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip content={<MixTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
          {models.map(model => {
            const color = getModelColor(model)
            const id = `mix-grad-${model.replace(/[\s.]/g, '-')}`
            return (
                <Area
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stackId="1"
                  stroke={color}
                  strokeWidth={0.5}
                  strokeOpacity={0.6}
                  fill={`url(#${id})`}
                  name={model}
                  isAnimationActive={animate}
                  animationBegin={CHART_ANIMATION.stagger * (models.indexOf(model) % 5)}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
              )
            })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartReveal>
        )}
      </ChartAnimationAware>
    </ChartCard>
  )
}
