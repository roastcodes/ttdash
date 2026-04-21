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
} from 'recharts'
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
import { coerceNumber, formatCurrency, formatDateAxis } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import { getModelProvider, getProviderBadgeStyle } from '@/lib/model-utils'
import type { CurrentMonthProviderForecasts } from '@/lib/calculations'
import type { DailyUsage } from '@/types'

interface CumulativeCostPerProviderProps {
  data: DailyUsage[]
  forecast: CurrentMonthProviderForecasts | null
}

type ProviderSeriesMeta = {
  provider: string
  actualKey: string
  projectedKey: string
  gradientId: string
  color: string
}

type ProviderCumulativePoint = Record<string, number | string | undefined> & {
  date: string
}

function toSeriesKey(provider: string) {
  return provider.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/** Renders cumulative cost by provider with an optional month-end projection. */
export function CumulativeCostPerProvider({ data, forecast }: CumulativeCostPerProviderProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')

  const { chartData, seriesMeta, topProvider } = useMemo(() => {
    const visibleTotals = new Map<string, number>()
    for (const entry of data) {
      for (const breakdown of entry.modelBreakdowns) {
        const provider = getModelProvider(breakdown.modelName)
        visibleTotals.set(provider, (visibleTotals.get(provider) ?? 0) + breakdown.cost)
      }
    }

    const providerForecasts = forecast?.providers ?? []
    const forecastTotals = new Map(
      providerForecasts.map((entry) => [entry.provider, entry.forecastTotal] as const),
    )

    const providers = Array.from(
      new Set([...visibleTotals.keys(), ...providerForecasts.map((entry) => entry.provider)]),
    )
      .filter(
        (provider) =>
          (visibleTotals.get(provider) ?? 0) > 0 || (forecastTotals.get(provider) ?? 0) > 0,
      )
      .sort((left, right) => {
        const visibleDelta = (visibleTotals.get(right) ?? 0) - (visibleTotals.get(left) ?? 0)
        if (visibleDelta !== 0) return visibleDelta

        const forecastDelta = (forecastTotals.get(right) ?? 0) - (forecastTotals.get(left) ?? 0)
        if (forecastDelta !== 0) return forecastDelta

        return left.localeCompare(right)
      })

    const nextSeriesMeta: ProviderSeriesMeta[] = providers.map((provider) => {
      const key = toSeriesKey(provider)
      return {
        provider,
        actualKey: `${key}Cumulative`,
        projectedKey: `${key}Projected`,
        gradientId: scopedGradientId(uid, `${key}-cumulative`),
        color: getProviderBadgeStyle(provider).color,
      }
    })

    const runningTotals = new Map<string, number>()
    const points: ProviderCumulativePoint[] = data.map((entry) => {
      const providerCosts = new Map<string, number>()
      for (const breakdown of entry.modelBreakdowns) {
        const provider = getModelProvider(breakdown.modelName)
        providerCosts.set(provider, (providerCosts.get(provider) ?? 0) + breakdown.cost)
      }

      const point: ProviderCumulativePoint = { date: entry.date }
      for (const series of nextSeriesMeta) {
        const nextTotal =
          (runningTotals.get(series.provider) ?? 0) + (providerCosts.get(series.provider) ?? 0)
        runningTotals.set(series.provider, nextTotal)
        point[series.actualKey] = nextTotal
      }

      return point
    })

    const last = points[points.length - 1]
    if (
      forecast &&
      last &&
      last.date.length === 10 &&
      last.date.startsWith(forecast.currentMonth) &&
      forecast.elapsedDays < forecast.daysInMonth
    ) {
      const bridgePoint: ProviderCumulativePoint = { ...last }
      const projectedPoint: ProviderCumulativePoint = {
        date: `${forecast.currentMonth}-${String(forecast.daysInMonth).padStart(2, '0')}`,
      }

      let hasProjection = false
      for (const entry of providerForecasts) {
        const series = nextSeriesMeta.find((candidate) => candidate.provider === entry.provider)
        if (!series) continue

        const visibleCurrentMonthActual = data.reduce((sum, point) => {
          if (point.date.length !== 10 || !point.date.startsWith(forecast.currentMonth)) return sum

          const providerCost = point.modelBreakdowns.reduce((providerSum, breakdown) => {
            return getModelProvider(breakdown.modelName) === entry.provider
              ? providerSum + breakdown.cost
              : providerSum
          }, 0)

          return sum + providerCost
        }, 0)

        const lastVisibleCumulative = coerceNumber(last[series.actualKey]) ?? 0
        const projectedIncrement = Math.max(0, entry.forecastTotal - visibleCurrentMonthActual)
        if (projectedIncrement <= 0) continue

        bridgePoint[series.projectedKey] = lastVisibleCumulative
        projectedPoint[series.projectedKey] = lastVisibleCumulative + projectedIncrement
        hasProjection = true
      }

      if (hasProjection) {
        points.push(bridgePoint, projectedPoint)
      }
    }

    const topProviderName = providers[0] ?? null
    const nextTopProvider =
      topProviderName === null
        ? null
        : {
            provider: topProviderName,
            total: visibleTotals.get(topProviderName) ?? 0,
          }

    return {
      chartData: points,
      seriesMeta: nextSeriesMeta,
      topProvider: nextTopProvider,
    }
  }, [data, forecast, uid])

  return (
    <ChartCard
      title={t('charts.cumulativeCostPerProvider.title')}
      subtitle={
        topProvider
          ? t('charts.cumulativeCostPerProvider.topDriver', {
              provider: topProvider.provider,
              total: formatCurrency(topProvider.total),
            })
          : t('charts.cumulativeCostPerProvider.subtitle')
      }
      info={CHART_HELP.cumulativeCostPerProvider}
      chartData={chartData}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="line">
            <ResponsiveContainer width="100%" height={300}>
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
                      <stop
                        offset="0%"
                        stopColor={series.color}
                        stopOpacity={CHART_AREA_GRADIENT.topOpacity}
                      />
                      <stop
                        offset="60%"
                        stopColor={series.color}
                        stopOpacity={CHART_AREA_GRADIENT.middleOpacity}
                      />
                      <stop
                        offset="100%"
                        stopColor={series.color}
                        stopOpacity={CHART_AREA_GRADIENT.bottomOpacity}
                      />
                    </linearGradient>
                  ))}
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
                  content={
                    <CustomTooltip
                      formatter={(value) => formatCurrency(value)}
                      showComputedTotal={false}
                      hideZeroValues
                    />
                  }
                  cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                />
                <Legend content={<ChartLegend />} />
                {seriesMeta.map((series, index) => (
                  <Area
                    key={series.actualKey}
                    type="monotone"
                    dataKey={series.actualKey}
                    stroke={series.color}
                    fill={`url(#${series.gradientId})`}
                    name={series.provider}
                    dot={false}
                    strokeWidth={2}
                    connectNulls={false}
                    {...getAreaAnimationProps(animate, { order: index % 5 })}
                  />
                ))}
                {seriesMeta.map((series, index) => (
                  <Line
                    key={series.projectedKey}
                    type="monotone"
                    dataKey={series.projectedKey}
                    stroke={series.color}
                    name={`${series.provider} ${t('charts.cumulativeCost.projection')}`}
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls
                    {...getLineAnimationProps(animate, { order: index % 5, role: 'secondary' })}
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
