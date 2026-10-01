import { MotionPie as Pie } from './chart-motion'
import { ResponsiveContainer, PieChart, Cell, Tooltip, Label } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import { CustomTooltip } from './CustomTooltip'
import { getRadialAnimationProps } from './chart-theme'
import { useModelColorHelpers } from '@/lib/model-color-context'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'

interface CostByModelProps {
  data: { name: string; value: number }[]
}

function CenterLabel({ x, y, total }: { x?: number; y?: number; total: string }) {
  const { t } = useTranslation()
  if (x === undefined || y === undefined) return null
  return (
    <g>
      <text x={x} y={y - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {t('charts.costByModel.total')}
      </text>
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={16}
        fontWeight={600}
      >
        {total}
      </text>
    </g>
  )
}

/** Renders the per-model cost distribution donut. */
export function CostByModel({ data }: CostByModelProps) {
  const { t } = useTranslation()
  const { getModelColor } = useModelColorHelpers()
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const sortedSegments = [...data].sort((a, b) => b.value - a.value)
  const leadingSegments = sortedSegments.slice(0, 3).map((entry) => ({
    ...entry,
    share: total > 0 ? (entry.value / total) * 100 : 0,
  }))
  const remainingValue = sortedSegments.slice(3).reduce((sum, entry) => sum + entry.value, 0)
  const topDriver = leadingSegments[0] ?? null

  return (
    <ChartCard
      title={t('charts.costByModel.title')}
      subtitle={t('charts.costByModel.subtitle')}
      summary={
        topDriver ? (
          <span className="block [overflow-wrap:anywhere]">
            {topDriver.name} · {formatPercent(topDriver.share, 0)}
          </span>
        ) : undefined
      }
      info={CHART_HELP.costByModel}
      chartData={data}
      valueKey="value"
      valueFormatter={formatCurrency}
    >
      {(expanded) => {
        const chartHeight = expanded ? 320 : 220
        const pieCenterY = '50%'
        const innerRadius = '53%'
        const outerRadius = '84%'
        const legendPayload = data.map((entry) => ({
          id: entry.name,
          value: entry.name,
          color: getModelColor(entry.name),
        }))

        return (
          <ChartAnimationAware data={data}>
            {(animate) => (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <ChartReveal variant="radial">
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy={pieCenterY}
                          innerRadius={innerRadius}
                          outerRadius={outerRadius}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          {...getRadialAnimationProps(animate)}
                          label={false}
                        >
                          {data.map((entry) => (
                            <Cell key={entry.name} fill={getModelColor(entry.name)} />
                          ))}
                          <Label
                            position="center"
                            content={<CenterLabel total={formatCurrency(total)} />}
                          />
                        </Pie>
                        <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartReveal>
                  <ChartLegend
                    className={expanded ? 'mt-2' : 'mt-1'}
                    payload={legendPayload}
                    renderLabel={(entry: { value?: string | number }) => {
                      const value = String(entry.value ?? '')
                      const segment = data.find((item) => item.name === value)
                      return segment ? `${value} (${formatCurrency(segment.value)})` : value
                    }}
                  />
                </div>

                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-2">
                  {leadingSegments.map((entry) => (
                    <div
                      key={entry.name}
                      className="min-w-0 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getModelColor(entry.name) }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium [overflow-wrap:anywhere] text-foreground">
                            {entry.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatPercent(entry.share, 0)} · {formatCurrency(entry.value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {remainingValue > 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
                      <div className="text-xs font-medium text-foreground">
                        {t('charts.costByModel.otherModels')}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatPercent((remainingValue / total) * 100, 0)} ·{' '}
                        {formatCurrency(remainingValue)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ChartAnimationAware>
        )
      }}
    </ChartCard>
  )
}
