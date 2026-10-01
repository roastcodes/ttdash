import { MotionPie as Pie } from './chart-motion'
import { ResponsiveContainer, PieChart, Cell, Tooltip, Label } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, getRadialAnimationProps } from './chart-theme'
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

function CenterLabel({ x, y, total }: { x?: number; y?: number; total: string }) {
  const { t } = useTranslation()
  if (x === undefined || y === undefined) return null
  return (
    <g>
      <text x={x} y={y - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {t('charts.tokenTypes.total')}
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

/** Renders the token composition donut chart. */
export function TokenTypes({ data }: TokenTypesProps) {
  const { t } = useTranslation()
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ChartCard
      title={t('charts.tokenTypes.title')}
      subtitle={t('charts.tokenTypes.subtitle')}
      info={CHART_HELP.tokenTypes}
      chartData={data}
      valueKey="value"
      valueFormatter={formatTokens}
    >
      {(expanded) => {
        const chartHeight = expanded ? 320 : 220
        const pieCenterY = '50%'
        const innerRadius = '53%'
        const outerRadius = '84%'

        return (
          <ChartAnimationAware data={data}>
            {(animate) => (
              <div>
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
                      >
                        {data.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={TOKEN_COLORS[entry.name] ?? CHART_COLORS.cost}
                          />
                        ))}
                        <Label
                          position="center"
                          content={<CenterLabel total={formatTokens(total)} />}
                        />
                      </Pie>
                      <Tooltip content={<CustomTooltip formatter={(v) => formatTokens(v)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartReveal>
                <ChartLegend
                  payload={data.map((entry) => ({
                    id: entry.name,
                    value: entry.name,
                    color: TOKEN_COLORS[entry.name] ?? CHART_COLORS.cost,
                  }))}
                  renderLabel={(entry) => {
                    const value = String(entry.value ?? '')
                    const segment = data.find((item) => item.name === value)
                    return `${value} (${segment ? formatTokens(segment.value) : ''})`
                  }}
                />
              </div>
            )}
          </ChartAnimationAware>
        )
      }}
    </ChartCard>
  )
}
