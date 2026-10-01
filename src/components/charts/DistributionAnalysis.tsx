import { toDistributionBins as toBins, type DistributionBin } from '@/lib/chart-distributions'
import { MotionBar as Bar } from './chart-motion'
import { ChartXAxis as XAxis, ChartYAxis as YAxis } from './chart-axis'
import { getRequestCountStatus } from '../../../shared/usage-quality.js'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  ChartAnimationAware,
  ChartCard,
  ChartReveal,
  useChartAnimationRunKey,
  ChartResponsiveContainer,
} from './ChartCard'
import { CHART_COLORS, CHART_MARGIN, getBarAnimationProps } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatTokens, periodLabel } from '@/lib/formatters'
import type { DailyUsage, ViewMode } from '@/types'

interface DistributionAnalysisProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

interface DistributionSeries {
  title: string
  data: DistributionBin[]
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: DistributionBin }>
}) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null

  const entry = payload[0]
  if (!entry) return null

  return (
    <div className="max-w-[280px] rounded-lg border border-border/50 bg-popover/90 p-3 text-xs shadow-lg backdrop-blur-xl">
      <p className="mb-1.5 font-medium text-muted-foreground">{entry.payload.label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('charts.distribution.interval')}</span>
          <span className="font-mono font-medium">{entry.payload.exactLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('charts.distribution.dataPoints')}</span>
          <span className="font-mono font-medium">{formatNumber(entry.value)}</span>
        </div>
      </div>
    </div>
  )
}

/** Renders histogram-based distribution analysis for cost and request metrics. */
export function DistributionAnalysis({ data, viewMode = 'daily' }: DistributionAnalysisProps) {
  const { t } = useTranslation()
  const uid = useId().replace(/:/g, '')

  const distributions = useMemo<DistributionSeries[]>(() => {
    if (data.length < 2) return []

    const costs = data.map((entry) => entry.totalCost)
    const knownRows = data.filter((entry) => getRequestCountStatus(entry) === 'known')
    const requests = knownRows.map((entry) => entry.requestCount)
    const tokensPerRequest = knownRows
      .filter((entry) => entry.requestCount > 0)
      .map((entry) => (entry.requestCount > 0 ? entry.totalTokens / entry.requestCount : 0))

    return [
      {
        title: t('charts.distribution.costPerPeriod', { period: periodLabel(viewMode) }),
        data: toBins(costs, formatCurrency),
      },
      {
        title: t('charts.distribution.requestsPerPeriod', { period: periodLabel(viewMode) }),
        data: toBins(requests, formatNumber),
      },
      {
        title: t('charts.distribution.tokensPerRequest', { period: periodLabel(viewMode) }),
        data: toBins(tokensPerRequest, formatTokens),
      },
    ]
  }, [data, viewMode, t])

  if (data.length < 2) {
    return (
      <ChartCard
        title={t('charts.distribution.title')}
        info={CHART_HELP.distributionAnalysis}
        expandable={false}
      >
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
          {t('charts.distribution.requiresData')}
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={t('charts.distribution.title')}
      info={CHART_HELP.distributionAnalysis}
      expandable={false}
    >
      <DistributionCharts distributions={distributions} uid={uid} />
    </ChartCard>
  )
}

function DistributionCharts({
  distributions,
  uid,
}: {
  distributions: DistributionSeries[]
  uid: string
}) {
  const { t } = useTranslation()
  const runKey = useChartAnimationRunKey()

  return (
    <div className="space-y-5">
      {distributions.map((distribution, index) => (
        <div key={distribution.title}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {distribution.title}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {distribution.data.reduce((sum, bin) => sum + bin.count, 0)}{' '}
              {t('charts.distribution.dataPoints')} · {distribution.data.length}{' '}
              {t('charts.distribution.buckets')}
            </div>
          </div>
          {distribution.data.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('common.notAvailable')}</p>
          )}
          <ChartAnimationAware data={distribution.data}>
            {(animate) => (
              <ChartReveal variant="bar">
                <ChartResponsiveContainer
                  key={`distribution-${runKey}-${index}`}
                  width="100%"
                  height={220}
                >
                  <BarChart data={distribution.data} margin={CHART_MARGIN}>
                    <defs>
                      <linearGradient
                        id={`${uid}-distribution-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_COLORS.grid}
                      opacity={0.25}
                    />
                    <XAxis
                      dataKey="label"
                      stroke={CHART_COLORS.axis}
                      fontSize={10}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke={CHART_COLORS.axis}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<DistributionTooltip />}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      fill={`url(#${uid}-distribution-${index})`}
                      {...getBarAnimationProps(animate, index)}
                    >
                      {distribution.data.map((_, binIndex) => {
                        const intensity =
                          distribution.data.length > 1
                            ? binIndex / (distribution.data.length - 1)
                            : 0
                        const opacity = 0.45 + intensity * 0.35
                        return (
                          <Cell
                            key={`${distribution.title}-${binIndex}`}
                            fill={`hsla(215, 70%, 55%, ${opacity.toFixed(2)})`}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ChartResponsiveContainer>
              </ChartReveal>
            )}
          </ChartAnimationAware>
        </div>
      ))}
    </div>
  )
}
