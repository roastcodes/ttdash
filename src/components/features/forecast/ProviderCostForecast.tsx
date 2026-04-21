import { useMemo } from 'react'
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
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { ChartCard, ChartAnimationAware, ChartReveal } from '@/components/charts/ChartCard'
import { ChartLegend } from '@/components/charts/ChartLegend'
import {
  CHART_COLORS,
  CHART_MARGIN,
  getAreaAnimationProps,
  getLineAnimationProps,
} from '@/components/charts/chart-theme'
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import { getProviderBadgeStyle } from '@/lib/model-utils'
import type { CurrentMonthProviderForecasts } from '@/lib/calculations'
import type { ViewMode } from '@/types'

interface ProviderCostForecastProps {
  forecast: CurrentMonthProviderForecasts | null
  viewMode?: ViewMode
  expandable?: boolean
  onExpand?: () => void
}

function showProviderForecastLegendEntry(entry: { dataKey?: string | number }) {
  const dataKey = typeof entry.dataKey === 'string' ? entry.dataKey : ''
  return !dataKey.endsWith('Lower')
}

type SeriesMeta = {
  provider: string
  actualKey: string
  forecastKey: string
  lowerKey: string
  bandKey: string
  gradientId: string
  monthEndForecast: number
  color: string
  backgroundColor: string
  borderColor: string
}

type ProviderTooltipEntry = {
  provider: string
  actual: number | undefined
  forecast: number | undefined
  lower: number | undefined
  monthEndForecast: number
  color: string
}

type ProviderSummary = {
  provider: string
  forecastTotal: number
  color: string
  backgroundColor: string
  borderColor: string
}

function toSeriesKey(provider: string) {
  return provider.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function ProviderForecastTooltip({
  active,
  payload,
  label,
  seriesMeta,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string; value?: number }>
  label?: string
  seriesMeta: SeriesMeta[]
}) {
  const { t } = useTranslation()

  if (!active || !payload?.length) return null

  const payloadMap = new Map<string, number>()
  for (const entry of payload) {
    if (typeof entry.dataKey === 'string' && typeof entry.value === 'number') {
      payloadMap.set(entry.dataKey, entry.value)
    }
  }

  const entries: ProviderTooltipEntry[] = seriesMeta
    .map((series) => ({
      provider: series.provider,
      actual: payloadMap.get(series.actualKey),
      forecast: payloadMap.get(series.forecastKey),
      lower: payloadMap.get(series.lowerKey),
      monthEndForecast: series.monthEndForecast,
      color: series.color,
    }))
    .filter(
      (entry) =>
        entry.actual !== undefined || entry.forecast !== undefined || entry.lower !== undefined,
    )

  if (entries.length === 0) return null

  return (
    <div className="max-w-[320px] rounded-lg border border-border/50 bg-popover/90 p-3 text-xs shadow-lg backdrop-blur-xl">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.provider} className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-foreground">{entry.provider}</span>
            </div>
            {entry.actual !== undefined && (
              <div className="flex items-center gap-2 pl-4">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{t('forecast.actualCost')}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {formatCurrency(entry.actual)}
                </span>
              </div>
            )}
            {entry.forecast !== undefined && (
              <div className="flex items-center gap-2 pl-4">
                <span
                  className="h-0.5 w-3 shrink-0 border-t-2 border-dashed"
                  style={{ borderColor: entry.color }}
                />
                <span className="text-muted-foreground">{t('forecast.projection')}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {formatCurrency(entry.forecast)}
                </span>
              </div>
            )}
            {entry.lower !== undefined && (
              <div className="flex items-center gap-2 pl-4">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color, opacity: 0.5 }}
                />
                <span className="text-muted-foreground">{t('forecast.lowerBound')}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {formatCurrency(entry.lower)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pl-4">
              <span
                className="h-2 w-2 shrink-0 rounded-full border"
                style={{ backgroundColor: entry.color, borderColor: entry.color }}
              />
              <span className="text-muted-foreground">{t('forecast.monthEndForecast')}:</span>
              <span className="ml-auto font-mono font-medium text-foreground">
                {formatCurrency(entry.monthEndForecast)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Renders the current-month forecast split by provider. */
export function ProviderCostForecast({
  forecast,
  viewMode = 'daily',
  expandable = true,
  onExpand,
}: ProviderCostForecastProps) {
  const { t } = useTranslation()

  const { chartData, providerSummaries, seriesMeta, providerCount } = useMemo(() => {
    if (viewMode !== 'daily') {
      return {
        chartData: [],
        providerSummaries: [] as ProviderSummary[],
        seriesMeta: [] as SeriesMeta[],
        providerCount: 0,
      }
    }

    if (!forecast) {
      return {
        chartData: [],
        providerSummaries: [] as ProviderSummary[],
        seriesMeta: [] as SeriesMeta[],
        providerCount: 0,
      }
    }

    const { currentMonth, elapsedDays, daysInMonth, providers } = forecast
    const points = Array.from({ length: daysInMonth }, (_, index) => ({
      date: `${currentMonth}-${String(index + 1).padStart(2, '0')}`,
    })) as Array<Record<string, number | string | undefined>>

    const nextSeriesMeta = providers.map((entry) => {
      const key = toSeriesKey(entry.provider)
      const style = getProviderBadgeStyle(entry.provider)
      const actualKey = `${key}Actual`
      const forecastKey = `${key}Forecast`
      const lowerKey = `${key}Lower`
      const bandKey = `${key}Band`
      const gradientId = `${key}ForecastGrad`

      for (const point of entry.elapsedCalendarSeries) {
        const index = Number(point.date.slice(8, 10)) - 1
        if (index >= 0) {
          points[index]![actualKey] = point.cost
        }
      }

      const lastActualCost =
        entry.elapsedCalendarSeries[entry.elapsedCalendarSeries.length - 1]?.cost ?? 0
      const lastPoint = points[elapsedDays - 1]
      if (lastPoint) {
        lastPoint[forecastKey] = lastActualCost
        lastPoint[lowerKey] = Math.max(0, lastActualCost - entry.volatility)
        lastPoint[bandKey] = Math.max(0, entry.volatility * 2)
      }

      for (let day = elapsedDays + 1; day <= daysInMonth; day++) {
        const point = points[day - 1]
        if (!point) continue
        point[forecastKey] = entry.projectedDailyBurn
        point[lowerKey] = entry.lowerDaily
        point[bandKey] = Math.max(0, entry.upperDaily - entry.lowerDaily)
      }

      return {
        provider: entry.provider,
        actualKey,
        forecastKey,
        lowerKey,
        bandKey,
        gradientId,
        monthEndForecast: entry.forecastTotal,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      }
    })

    return {
      chartData: points,
      providerSummaries: nextSeriesMeta.map((series) => ({
        provider: series.provider,
        forecastTotal: series.monthEndForecast,
        color: series.color,
        backgroundColor: series.backgroundColor,
        borderColor: series.borderColor,
      })),
      seriesMeta: nextSeriesMeta,
      providerCount: providers.length,
    }
  }, [forecast, viewMode])

  if (viewMode !== 'daily') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/80 p-6 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">
            {t('forecast.providerDailyOnly')}
          </p>
        </div>
      </div>
    )
  }

  if (chartData.length === 0 || seriesMeta.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/80 p-6 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">{t('forecast.noForecast')}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {t('forecast.providerRequiresData')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ChartCard
      title={t('forecast.providerChartTitle')}
      subtitle={t('forecast.providerChartSubtitle', { count: providerCount })}
      summary={
        <span
          data-testid="provider-forecast-summary"
          className="inline-flex max-w-[420px] flex-wrap justify-end gap-1.5"
        >
          {providerSummaries.map((provider) => (
            <span
              key={provider.provider}
              data-testid="provider-forecast-chip"
              data-provider={provider.provider}
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
              style={{
                color: provider.color,
                backgroundColor: provider.backgroundColor,
                borderColor: provider.borderColor,
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: provider.color }}
              />
              <span>{provider.provider}</span>
              <span className="font-mono text-foreground">
                {formatCurrency(provider.forecastTotal)}
              </span>
            </span>
          ))}
        </span>
      }
      info={CHART_HELP.providerForecast}
      expandable={expandable}
      chartData={chartData}
      valueFormatter={formatCurrency}
      {...(onExpand ? { onExpand } : {})}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={CHART_MARGIN}>
                <defs>
                  {seriesMeta.map((series) => (
                    <linearGradient
                      key={series.gradientId}
                      id={series.gradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={series.color} stopOpacity={0.26} />
                      <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
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
                <Tooltip content={<ProviderForecastTooltip seriesMeta={seriesMeta} />} />
                <Legend content={<ChartLegend filterEntry={showProviderForecastLegendEntry} />} />
                {seriesMeta.map((series) => (
                  <Area
                    key={`${series.provider}-lower`}
                    type="monotone"
                    dataKey={series.lowerKey}
                    stackId={`provider-band-${series.provider}`}
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    isAnimationActive={false}
                  />
                ))}
                {seriesMeta.map((series, index) => (
                  <Area
                    key={`${series.provider}-band`}
                    type="monotone"
                    dataKey={series.bandKey}
                    stackId={`provider-band-${series.provider}`}
                    stroke="none"
                    fill={series.backgroundColor}
                    fillOpacity={0.36}
                    legendType="none"
                    name={`${series.provider} ${t('forecast.uncertaintyBand')}`}
                    {...getAreaAnimationProps(animate, { order: index, role: 'stacked' })}
                  />
                ))}
                {seriesMeta.map((series, index) => (
                  <Area
                    key={`${series.provider}-actual`}
                    type="monotone"
                    dataKey={series.actualKey}
                    stroke={series.color}
                    fill={`url(#${series.gradientId})`}
                    fillOpacity={1}
                    name={series.provider}
                    dot={false}
                    strokeWidth={2}
                    connectNulls={false}
                    {...getAreaAnimationProps(animate, { order: index })}
                  />
                ))}
                {seriesMeta.map((series, index) => (
                  <Line
                    key={`${series.provider}-forecast`}
                    type="monotone"
                    dataKey={series.forecastKey}
                    stroke={series.color}
                    name={`${series.provider} ${t('forecast.projection')}`}
                    legendType="none"
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    strokeOpacity={0.95}
                    connectNulls
                    {...getLineAnimationProps(animate, { order: index, role: 'secondary' })}
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
