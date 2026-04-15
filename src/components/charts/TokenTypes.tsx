import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_ANIMATION } from './chart-theme'
import { formatTokens } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'

const TOKEN_COLORS: Record<string, string> = {
  Input: CHART_COLORS.input,
  Output: CHART_COLORS.output,
  'Cache Write': CHART_COLORS.cacheWrite,
  'Cache Read': CHART_COLORS.cacheRead,
  Thinking: CHART_COLORS.cost,
}

interface TokenTypesProps {
  data: { name: string; value: number }[]
}

function CenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: string }) {
  const { t } = useTranslation()
  if (!viewBox) return null
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {t('charts.tokenTypes.total')}
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

/** Renders the token composition donut chart. */
export function TokenTypes({ data }: TokenTypesProps) {
  const { t } = useTranslation()
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ChartCard
      title={t('charts.tokenTypes.title')}
      subtitle={t('charts.tokenTypes.subtitle')}
      info={CHART_HELP.tokenTypes}
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="value"
      valueFormatter={formatTokens}
    >
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
                    >
                      {data.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={TOKEN_COLORS[entry.name] ?? CHART_COLORS.cost}
                        />
                      ))}
                      <CenterLabel total={formatTokens(total)} />
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(v) => formatTokens(v)} />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: expanded ? '22px' : '8px' }}
                      formatter={(value: string) => {
                        const entry = data.find((d) => d.name === value)
                        return (
                          <span className="text-xs text-foreground">
                            {value} ({entry ? formatTokens(entry.value) : ''})
                          </span>
                        )
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
