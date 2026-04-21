import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
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

function CenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: string }) {
  const { t } = useTranslation()
  if (!viewBox) return null
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {t('charts.costByModel.total')}
      </text>
      <text
        x={cx}
        y={cy + 14}
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
          <span className="max-w-[10rem] truncate">
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
        const chartHeight = expanded ? 560 : 320
        const pieCenterY = expanded ? '66%' : '57%'
        const innerRadius = expanded ? 84 : 58
        const outerRadius = expanded ? 134 : 92

        return (
          <ChartAnimationAware>
            {(animate) => (
              <div className="flex h-full flex-col gap-4">
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
                        <CenterLabel total={formatCurrency(total)} />
                      </Pie>
                      <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
                      <Legend
                        content={
                          <ChartLegend
                            className={expanded ? 'pt-[22px]' : 'pt-2'}
                            renderLabel={(entry: { value?: string | number }) => {
                              const value = String(entry.value ?? '')
                              const segment = data.find((item) => item.name === value)
                              return segment ? `${value} (${formatCurrency(segment.value)})` : value
                            }}
                          />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartReveal>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {leadingSegments.map((entry) => (
                    <div
                      key={entry.name}
                      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getModelColor(entry.name) }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-foreground">
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
