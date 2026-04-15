import { useMemo, useId } from 'react'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { ChartLegend } from './ChartLegend'
import { CustomTooltip } from './CustomTooltip'
import {
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getLineAnimationProps,
  getRadialAnimationProps,
} from './chart-theme'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDateAxis, periodUnit } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import { getModelColor } from '@/lib/model-utils'
import { CHART_HELP } from '@/lib/help-content'
import type { RequestChartDataPoint, ViewMode } from '@/types'

interface RequestsOverTimeProps {
  data: RequestChartDataPoint[]
  viewMode?: ViewMode
  onClickDay?: (date: string) => void
}

function formatRequests(value: number) {
  return new Intl.NumberFormat(getCurrentLocale(), {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value)
}

function RequestCenterLabel({
  viewBox,
  total,
}: {
  viewBox?: { cx: number; cy: number }
  total: string
}) {
  const { t } = useTranslation()
  if (!viewBox) return null
  const { cx, cy } = viewBox

  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {t('charts.requestsOverTime.total')}
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

/** Renders request volume over time with optional drilldown. */
export function RequestsOverTime({ data, viewMode = 'daily', onClickDay }: RequestsOverTimeProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')
  const averageLabel = t('charts.requestsOverTime.averagePerUnit', { unit: periodUnit(viewMode) })
  const trendLabel =
    viewMode === 'daily'
      ? t('charts.requestsOverTime.movingAverage')
      : t('charts.requestsOverTime.trend')
  const trendHeading =
    viewMode === 'daily'
      ? t('charts.requestsOverTime.movingAverageHeading')
      : t('charts.requestsOverTime.trendHeading')

  const summary = useMemo(() => {
    if (data.length === 0) return null

    const modelTotals = new Map<string, number>()
    for (const point of data) {
      for (const [key, value] of Object.entries(point)) {
        if (
          key === 'date' ||
          key === 'totalRequests' ||
          key === 'totalRequestsMA7' ||
          key === 'totalRequestsPrev' ||
          key.endsWith('_ma7') ||
          key.endsWith('Prev')
        )
          continue
        if (typeof value === 'number') {
          modelTotals.set(key, (modelTotals.get(key) ?? 0) + value)
        }
      }
    }

    const topModels = Array.from(modelTotals.entries()).sort((a, b) => b[1] - a[1])

    const totalRequests = data.reduce((sum, point) => sum + point.totalRequests, 0)
    const peak = [...data].sort((a, b) => b.totalRequests - a.totalRequests)[0]
    if (!peak) return null

    return {
      totalRequests,
      peak,
      topModels,
    }
  }, [data])

  const visibleModels = useMemo(
    () => (summary?.topModels ?? []).slice(0, 5).map(([name]) => name),
    [summary],
  )
  const donutData = useMemo(
    () => (summary?.topModels ?? []).map(([name, value]) => ({ name, value })),
    [summary],
  )

  const handleClick = (e: unknown) => {
    const payload = e as { activePayload?: { payload?: { date?: string } }[] }
    if (payload?.activePayload?.[0]?.payload?.date && onClickDay) {
      onClickDay(payload.activePayload[0].payload.date)
    }
  }

  const expandedChart = (
    <ChartAnimationAware>
      {(animate) => (
        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 text-[10px] tracking-wider text-muted-foreground uppercase">
              {trendHeading}
            </div>
            <ChartReveal variant="line">
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={data} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateAxis}
                    stroke={CHART_COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatRequests}
                    stroke={CHART_COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={(v) => formatRequests(v)} />}
                    cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                  />
                  <Legend content={<ChartLegend />} />
                  <Line
                    type="monotone"
                    dataKey="totalRequestsMA7"
                    stroke={CHART_COLORS.ma7}
                    name={t('charts.requestsOverTime.totalMovingAverage', { label: trendLabel })}
                    dot={false}
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    connectNulls
                    {...getLineAnimationProps(animate, { role: 'secondary' })}
                  />
                  {(summary?.topModels ?? []).map(([model], index) => (
                    <Line
                      key={`${model}_ma7`}
                      type="monotone"
                      dataKey={`${model}_ma7`}
                      stroke={getModelColor(model)}
                      name={`${model} ${trendLabel}`}
                      dot={false}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      connectNulls
                      {...getLineAnimationProps(animate, { order: index % 6, role: 'secondary' })}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartReveal>
          </div>

          <div>
            <div className="mb-2 text-[10px] tracking-wider text-muted-foreground uppercase">
              {t('charts.requestsOverTime.requestsByModelTotal')}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(summary?.topModels ?? []).map(([model, total]) => {
                const share =
                  summary && summary.totalRequests > 0 ? (total / summary.totalRequests) * 100 : 0
                return (
                  <div key={model} className="rounded-lg border border-border/50 bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getModelColor(model) }}
                        />
                        <div className="truncate text-sm font-medium">{model}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{share.toFixed(1)}%</div>
                    </div>
                    <div className="mt-2 text-lg font-semibold tabular-nums">
                      {formatRequests(total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('charts.requestsOverTime.requestsInRange')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </ChartAnimationAware>
  )

  return (
    <ChartCard
      title={t('charts.requestsOverTime.title')}
      subtitle={
        summary
          ? t('charts.requestsOverTime.summary', {
              total: formatRequests(summary.totalRequests),
              peak: formatRequests(summary.peak.totalRequests),
              date: formatDateAxis(summary.peak.date),
            })
          : t('charts.requestsOverTime.subtitle')
      }
      info={CHART_HELP.requestsOverTime}
      summary={summary ? <FormattedValue value={summary.totalRequests} type="number" /> : undefined}
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="totalRequests"
      valueFormatter={formatRequests}
      expandedExtra={expandedChart}
    >
      {(expanded) => {
        const lineHeight = expanded ? 420 : 320
        const donutHeight = expanded ? 440 : 340
        const innerRadius = expanded ? 70 : 54
        const outerRadius = expanded ? 112 : 82
        const donutCenterY = expanded ? '48%' : '46%'

        return (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
              <div className="rounded-lg bg-muted/20 p-2">
                <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
                  {t('charts.requestsOverTime.total')}
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {summary ? formatRequests(summary.totalRequests) : '0'}
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-2">
                <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
                  {averageLabel}
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {summary && data.length > 0
                    ? formatRequests(summary.totalRequests / data.length)
                    : '0'}
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-2">
                <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
                  {t('charts.requestsOverTime.topModel')}
                </div>
                <div className="truncate text-sm font-semibold">
                  {summary?.topModels[0]?.[0] ?? '–'}
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-2">
                <div className="text-[9px] tracking-wider text-muted-foreground uppercase">
                  {t('charts.requestsOverTime.topShare')}
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {summary && summary.totalRequests > 0 && summary.topModels[0]
                    ? `${((summary.topModels[0][1] / summary.totalRequests) * 100).toFixed(1)}%`
                    : '–'}
                </div>
              </div>
            </div>

            <div
              className={`grid gap-4 ${expanded ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'}`}
            >
              <div className={expanded ? 'xl:col-span-2' : 'lg:col-span-2'}>
                <ChartAnimationAware>
                  {(animate) => (
                    <ChartReveal variant="line">
                      <ResponsiveContainer width="100%" height={lineHeight}>
                        <ComposedChart data={data} margin={CHART_MARGIN} onClick={handleClick}>
                          <defs>
                            <linearGradient id={`${uid}-requests`} x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor={CHART_COLORS.cumulative}
                                stopOpacity={0.28}
                              />
                              <stop
                                offset="100%"
                                stopColor={CHART_COLORS.cumulative}
                                stopOpacity={0}
                              />
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
                            tickFormatter={formatRequests}
                            stroke={CHART_COLORS.axis}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            content={
                              <CustomTooltip
                                formatter={(v) => formatRequests(v)}
                                pinnedEntryNames={[
                                  t('charts.requestsOverTime.totalRequestsSeries'),
                                ]}
                                showComputedTotal={false}
                              />
                            }
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.12 }}
                          />
                          <Legend content={<ChartLegend />} />
                          <Area
                            type="monotone"
                            dataKey="totalRequests"
                            stroke={CHART_COLORS.cumulative}
                            fill={`url(#${uid}-requests)`}
                            name={t('charts.requestsOverTime.totalRequestsSeries')}
                            strokeWidth={1.8}
                            dot={false}
                            activeDot={{
                              r: 5,
                              strokeWidth: 2,
                              stroke: CHART_COLORS.cumulative,
                              fill: 'hsl(var(--background))',
                            }}
                            {...getAreaAnimationProps(animate)}
                          />
                          <Line
                            type="monotone"
                            dataKey="totalRequestsMA7"
                            stroke={CHART_COLORS.ma7}
                            name={trendLabel}
                            dot={false}
                            strokeWidth={2.2}
                            strokeDasharray="5 5"
                            connectNulls
                            {...getLineAnimationProps(animate, { role: 'secondary' })}
                          />
                          {visibleModels.map((model, index) => (
                            <Line
                              key={model}
                              type="monotone"
                              dataKey={model}
                              stroke={getModelColor(model)}
                              name={model}
                              dot={false}
                              strokeWidth={1.6}
                              {...getLineAnimationProps(animate, { order: (index % 5) + 1 })}
                            />
                          ))}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartReveal>
                  )}
                </ChartAnimationAware>
              </div>

              <div className="min-w-0 pt-1">
                <ChartAnimationAware>
                  {(animate) => (
                    <ChartReveal variant="radial">
                      <ResponsiveContainer width="100%" height={donutHeight}>
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy={donutCenterY}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            {...getRadialAnimationProps(animate)}
                          >
                            {donutData.map((entry) => (
                              <Cell key={entry.name} fill={getModelColor(entry.name)} />
                            ))}
                            <RequestCenterLabel
                              total={summary ? formatRequests(summary.totalRequests) : '0'}
                            />
                          </Pie>
                          <Tooltip
                            content={<CustomTooltip formatter={(v) => formatRequests(v)} />}
                          />
                          <Legend
                            content={
                              <ChartLegend
                                className={expanded ? 'pt-[18px]' : 'pt-2'}
                                renderLabel={(entry: { value?: string | number }) => {
                                  const value = String(entry.value ?? '')
                                  const segment = donutData.find((item) => item.name === value)
                                  return `${value} (${segment ? formatRequests(segment.value) : ''})`
                                }}
                              />
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartReveal>
                  )}
                </ChartAnimationAware>
              </div>
            </div>
          </>
        )
      }}
    </ChartCard>
  )
}
