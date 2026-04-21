import { useId } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import { CustomTooltip } from './CustomTooltip'
import {
  CHART_AREA_GRADIENT,
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getLineAnimationProps,
  scopedGradientId,
} from './chart-theme'
import { useModelColorHelpers } from '@/lib/model-color-context'
import type { ModelCostChartPoint } from '@/lib/data-transforms'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'

interface CostByModelOverTimeProps {
  data: ModelCostChartPoint[]
  models: string[]
}

/** Renders the per-model cost trend over time. */
export function CostByModelOverTime({ data, models }: CostByModelOverTimeProps) {
  const { t } = useTranslation()
  const { getModelColor } = useModelColorHelpers()
  const uid = useId().replace(/:/g, '')
  const topModel =
    models
      .map((model) => ({
        model,
        total: data.reduce((sum, point) => {
          const value = coerceNumber(point[model])
          return sum + (value ?? 0)
        }, 0),
      }))
      .sort((a, b) => b.total - a.total)[0] ?? null

  // Expanded extra: taller chart with per-model 7-day MA lines
  const expandedChart = (
    <ChartAnimationAware>
      {(animate) => (
        <div className="mt-6">
          <div className="mb-2 text-[10px] tracking-wider text-muted-foreground uppercase">
            {t('charts.costByModelOverTime.movingAverageHeading')}
          </div>
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateAxis}
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => {
                    const numericValue = coerceNumber(value)
                    return numericValue === null ? '' : formatCurrency(numericValue)
                  }}
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
                  cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                />
                <Legend content={<ChartLegend />} />
                {models.map((model, index) => (
                  <Line
                    key={`${model}_ma7`}
                    type="monotone"
                    dataKey={`${model}_ma7`}
                    stroke={getModelColor(model)}
                    name={`${model} ${t('charts.costByModelOverTime.movingAverageSuffix')}`}
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    connectNulls
                    {...getLineAnimationProps(animate, { order: index % 5, role: 'secondary' })}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartReveal>
        </div>
      )}
    </ChartAnimationAware>
  )

  return (
    <ChartCard
      title={t('charts.costByModelOverTime.title')}
      subtitle={
        topModel
          ? t('charts.costByModelOverTime.topDriver', {
              model: topModel.model,
              total: formatCurrency(topModel.total),
            })
          : t('charts.costByModelOverTime.subtitle')
      }
      info={CHART_HELP.costByModelOverTime}
      chartData={data}
      valueKey="cost"
      valueFormatter={formatCurrency}
      expandedExtra={expandedChart}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data} margin={CHART_MARGIN}>
                <defs>
                  {models.map((model) => {
                    const color = getModelColor(model)
                    const id = scopedGradientId(uid, model)

                    return (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={color}
                          stopOpacity={CHART_AREA_GRADIENT.topOpacity}
                        />
                        <stop
                          offset="60%"
                          stopColor={color}
                          stopOpacity={CHART_AREA_GRADIENT.middleOpacity}
                        />
                        <stop
                          offset="100%"
                          stopColor={color}
                          stopOpacity={CHART_AREA_GRADIENT.bottomOpacity}
                        />
                      </linearGradient>
                    )
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateAxis}
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => {
                    const numericValue = coerceNumber(value)
                    return numericValue === null ? '' : formatCurrency(numericValue)
                  }}
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
                  cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                />
                <Legend content={<ChartLegend />} />
                {models.map((model, index) => (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stroke={getModelColor(model)}
                    fill={`url(#${scopedGradientId(uid, model)})`}
                    name={model}
                    dot={false}
                    strokeWidth={1.5}
                    {...getAreaAnimationProps(animate, { order: index % 5 })}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartReveal>
        )}
      </ChartAnimationAware>
    </ChartCard>
  )
}
