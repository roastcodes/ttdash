import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { ChartAnimationAware, ChartCard, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import {
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getBarAnimationProps,
  getLineAnimationProps,
} from './chart-theme'
import { CustomTooltip } from './CustomTooltip'
import { CHART_HELP } from '@/lib/help-content'
import { computeCacheHitRateByModel, computeMovingAverage } from '@/lib/calculations'
import { formatDateAxis, formatPercent, periodUnit } from '@/lib/formatters'
import { getModelColor, normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage, ViewMode } from '@/types'

interface RequestCacheHitRateByModelProps {
  timelineData: DailyUsage[]
  summaryData: DailyUsage[]
  viewMode: ViewMode
}

function formatRate(value: number) {
  return formatPercent(value, 1)
}

function computePointRate(
  input: number,
  output: number,
  cacheCreate: number,
  cacheRead: number,
  thinking: number,
) {
  const base = input + output + cacheCreate + cacheRead + thinking
  return base > 0 ? (cacheRead / base) * 100 : 0
}

/** Renders cache hit-rate comparisons grouped by model. */
export function RequestCacheHitRateByModel({
  timelineData,
  summaryData,
  viewMode,
}: RequestCacheHitRateByModelProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')
  const totalLabel = t('charts.requestCacheHitRate.total')
  const trendLabel =
    viewMode === 'daily'
      ? t('charts.requestCacheHitRate.trailing7Rate')
      : t('charts.requestCacheHitRate.trendRate')

  const barData = useMemo(
    () =>
      computeCacheHitRateByModel(summaryData).map((entry) => ({
        ...entry,
        model: entry.model === 'Total' ? totalLabel : entry.model,
      })),
    [summaryData, totalLabel],
  )

  const summary = useMemo(() => {
    if (barData.length === 0) return null
    const total = barData[0]
    if (!total) return null
    const topModel = barData.slice(1).sort((a, b) => b.totalRate - a.totalRate)[0] ?? null
    const dominantModel =
      barData.slice(1).sort((a, b) => b.totalBaseTokens - a.totalBaseTokens)[0] ?? null

    return {
      total,
      topModel,
      dominantModel,
      models: Math.max(barData.length - 1, 0),
    }
  }, [barData])

  const lineData = useMemo(() => {
    if (timelineData.length === 0) return []

    const topModels = barData.slice(1).map((entry) => entry.model)

    const sorted = [...timelineData].sort((a, b) => a.date.localeCompare(b.date))
    const totalRates = sorted.map((point) =>
      computePointRate(
        point.inputTokens,
        point.outputTokens,
        point.cacheCreationTokens,
        point.cacheReadTokens,
        point.thinkingTokens,
      ),
    )
    const totalTrend = computeMovingAverage(totalRates, Math.min(7, sorted.length))

    const modelSeries: Record<string, number[]> = {}
    for (const model of topModels) modelSeries[model] = []

    for (const point of sorted) {
      const byModel = new Map<
        string,
        { input: number; output: number; cacheCreate: number; cacheRead: number; thinking: number }
      >()

      for (const breakdown of point.modelBreakdowns) {
        const name = normalizeModelName(breakdown.modelName)
        if (!topModels.includes(name)) continue
        const current = byModel.get(name) ?? {
          input: 0,
          output: 0,
          cacheCreate: 0,
          cacheRead: 0,
          thinking: 0,
        }
        current.input += breakdown.inputTokens
        current.output += breakdown.outputTokens
        current.cacheCreate += breakdown.cacheCreationTokens
        current.cacheRead += breakdown.cacheReadTokens
        current.thinking += breakdown.thinkingTokens
        byModel.set(name, current)
      }

      for (const model of topModels) {
        const current = byModel.get(model)
        const series = modelSeries[model]
        if (series) {
          series.push(
            current
              ? computePointRate(
                  current.input,
                  current.output,
                  current.cacheCreate,
                  current.cacheRead,
                  current.thinking,
                )
              : 0,
          )
        }
      }
    }

    return sorted.map((point, index) => {
      const row: Record<string, unknown> = {
        date: point.date,
        totalRate: totalRates[index],
        totalRate_ma7: totalTrend[index],
      }

      for (const model of topModels) {
        row[model] = modelSeries[model]?.[index] ?? 0
      }

      return row
    })
  }, [timelineData, barData])

  if (!summary || lineData.length === 0) return null

  const compactBarHeight = Math.max(220, Math.min(310, barData.length * 28 + 48))
  const expandedBarHeight = Math.max(280, Math.min(420, barData.length * 34 + 56))
  const lineHeight = viewMode === 'daily' ? 280 : 250
  const expandedLineHeight = viewMode === 'daily' ? 360 : 320

  const lineSeries = Object.keys(lineData[0] ?? {}).filter(
    (key) => key !== 'date' && key !== 'totalRate' && key !== 'totalRate_ma7',
  )

  const expandedExtra = (
    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
      {barData.slice(0, 6).map((entry) => (
        <div key={entry.model} className="rounded-lg border border-border/50 bg-muted/10 p-3">
          <div className="truncate text-sm font-medium">{entry.model}</div>
          <div className="mt-2 flex items-end gap-3">
            <div>
              <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                {t('charts.requestCacheHitRate.totalRate')}
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {formatRate(entry.totalRate)}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                {t('charts.requestCacheHitRate.trailing7Rate')}
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {formatRate(entry.trailing7Rate)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderCharts = (expanded: boolean) => {
    const snapshotBarSize = expanded ? 8 : 6

    return (
      <>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.totalRate')}
            </div>
            <div className="text-sm font-semibold tabular-nums">
              {formatRate(summary.total.totalRate)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.trailing7Rate')}
            </div>
            <div className="text-sm font-semibold tabular-nums">
              {formatRate(summary.total.trailing7Rate)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.topModel')}
            </div>
            <div className="truncate text-sm font-semibold">{summary.topModel?.model ?? '–'}</div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.models')}
            </div>
            <div className="text-sm font-semibold tabular-nums">{summary.models}</div>
          </div>
        </div>

        <div
          className={`grid gap-4 ${expanded ? 'grid-cols-1 xl:grid-cols-[2fr_1fr]' : 'grid-cols-1 lg:grid-cols-[2fr_1fr]'}`}
        >
          <div>
            <div className="mb-2 text-[10px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.timelineHeading', { unit: periodUnit(viewMode) })}
            </div>
            <ChartAnimationAware>
              {(animate) => (
                <ChartReveal variant="line">
                  <ResponsiveContainer
                    width="100%"
                    height={expanded ? expandedLineHeight : lineHeight}
                  >
                    <ComposedChart data={lineData} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id={`${uid}-total-rate`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.24} />
                          <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_COLORS.grid}
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateAxis}
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={formatRate}
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatter={(value) => formatRate(value)}
                            pinnedEntryNames={[t('charts.requestCacheHitRate.totalRate')]}
                            showComputedTotal={false}
                            hideZeroValues
                          />
                        }
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.12 }}
                      />
                      <Legend content={<ChartLegend />} />
                      <Area
                        type="monotone"
                        dataKey="totalRate"
                        stroke={CHART_COLORS.cost}
                        fill={`url(#${uid}-total-rate)`}
                        name={t('charts.requestCacheHitRate.totalRate')}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 2,
                          stroke: CHART_COLORS.cost,
                          fill: 'hsl(var(--background))',
                        }}
                        {...getAreaAnimationProps(animate)}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalRate_ma7"
                        stroke={CHART_COLORS.ma7}
                        name={trendLabel}
                        dot={false}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        connectNulls
                        {...getLineAnimationProps(animate, { role: 'secondary' })}
                      />
                      {lineSeries.map((series, index) => (
                        <Line
                          key={series}
                          type="monotone"
                          dataKey={series}
                          stroke={getModelColor(series)}
                          name={series}
                          dot={false}
                          strokeWidth={1.8}
                          connectNulls
                          {...getLineAnimationProps(animate, {
                            order: index + 2,
                            role: 'secondary',
                          })}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartReveal>
              )}
            </ChartAnimationAware>
          </div>

          <div>
            <div className="mb-2 text-[10px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestCacheHitRate.modelBreakdownHeading')}
            </div>
            <ChartAnimationAware>
              {(animate) => (
                <ChartReveal variant="line">
                  <ResponsiveContainer
                    width="100%"
                    height={expanded ? expandedBarHeight : compactBarHeight}
                  >
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ ...CHART_MARGIN, left: expanded ? 30 : 20, right: 8 }}
                      barCategoryGap={expanded ? 14 : 10}
                      barSize={snapshotBarSize}
                      maxBarSize={snapshotBarSize}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_COLORS.grid}
                        opacity={0.22}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={formatRate}
                        stroke={CHART_COLORS.axis}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="model"
                        stroke={CHART_COLORS.axis}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={expanded ? 126 : 108}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            formatter={(value) => formatRate(value)}
                            pinnedEntryNames={[
                              t('charts.requestCacheHitRate.totalRate'),
                              t('charts.requestCacheHitRate.trailing7Rate'),
                            ]}
                            showComputedTotal={false}
                          />
                        }
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.12 }}
                      />
                      <Legend content={<ChartLegend />} />
                      <Bar
                        dataKey="totalRate"
                        name={t('charts.requestCacheHitRate.totalRate')}
                        radius={[0, 4, 4, 0]}
                        fill={CHART_COLORS.cacheRead}
                        {...getBarAnimationProps(animate)}
                      >
                        {barData.map((entry) => (
                          <Cell
                            key={`${entry.model}-total`}
                            fill={
                              entry.model === totalLabel
                                ? CHART_COLORS.cost
                                : CHART_COLORS.cacheRead
                            }
                            fillOpacity={entry.model === totalLabel ? 0.95 : 0.82}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="trailing7Rate"
                        name={t('charts.requestCacheHitRate.trailing7Rate')}
                        radius={[0, 4, 4, 0]}
                        fill={CHART_COLORS.ma7}
                        {...getBarAnimationProps(animate, 1)}
                      >
                        {barData.map((entry) => (
                          <Cell
                            key={`${entry.model}-recent`}
                            fill={
                              entry.model === totalLabel
                                ? CHART_COLORS.cumulative
                                : CHART_COLORS.ma7
                            }
                            fillOpacity={entry.model === totalLabel ? 0.95 : 0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartReveal>
              )}
            </ChartAnimationAware>
          </div>
        </div>
      </>
    )
  }

  return (
    <ChartCard
      title={t('charts.requestCacheHitRate.title')}
      subtitle={t('charts.requestCacheHitRate.subtitle', {
        total: formatRate(summary.total.totalRate),
        trailing: formatRate(summary.total.trailing7Rate),
      })}
      info={CHART_HELP.requestCacheHitRate}
      chartData={barData as unknown as Record<string, unknown>[]}
      valueKey="totalRate"
      valueFormatter={formatRate}
      expandedExtra={expandedExtra}
    >
      {renderCharts}
    </ChartCard>
  )
}
