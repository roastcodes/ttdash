import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_ANIMATION } from './chart-theme'
import { getModelColor } from '@/lib/model-utils'
import { formatCurrency } from '@/lib/formatters'
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
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-foreground" fontSize={16} fontWeight={600}>
        {total}
      </text>
    </g>
  )
}

export function CostByModel({ data }: CostByModelProps) {
  const { t } = useTranslation()
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ChartCard title={t('charts.costByModel.title')} subtitle={t('charts.costByModel.subtitle')} info={CHART_HELP.costByModel} chartData={data as unknown as Record<string, unknown>[]} valueKey="value" valueFormatter={formatCurrency}>
      {(expanded) => {
        const chartHeight = expanded ? 560 : 320
        const pieCenterY = expanded ? '66%' : '57%'
        const innerRadius = expanded ? 84 : 58
        const outerRadius = expanded ? 134 : 92

        return (
          <ChartAnimationAware>
            {(animate) => (
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
                      isAnimationActive={animate}
                      animationDuration={CHART_ANIMATION.duration}
                      animationBegin={CHART_ANIMATION.stagger}
                      animationEasing={CHART_ANIMATION.easing}
                      label={false}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.name} fill={getModelColor(entry.name)} />
                      ))}
                      <CenterLabel total={formatCurrency(total)} />
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: expanded ? '22px' : '8px' }}
                      formatter={(value: string) => {
                        const entry = data.find(d => d.name === value)
                        return <span className="text-xs text-foreground">{value} ({entry ? formatCurrency(entry.value) : ''})</span>
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartReveal>
            )}
          </ChartAnimationAware>
        )
      }}
    </ChartCard>
  )
}
