import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatTokens, periodLabel } from '@/lib/formatters'
import { useShouldReduceMotion } from '@/lib/motion'
import type { DailyUsage, ViewMode } from '@/types'

interface DistributionAnalysisProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

interface DistributionBin {
  label: string
  rangeStart: number
  rangeEnd: number
  count: number
}

function toBins(values: number[], formatter: (value: number) => string): DistributionBin[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const bucketCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))))
  const span = max - min || 1
  const bucketSize = span / bucketCount

  const bins = Array.from({ length: bucketCount }, (_, index) => {
    const rangeStart = min + bucketSize * index
    const rangeEnd = index === bucketCount - 1 ? max : rangeStart + bucketSize
    return {
      label: `${formatter(rangeStart)}–${formatter(rangeEnd)}`,
      rangeStart,
      rangeEnd,
      count: 0,
    }
  })

  for (const value of values) {
    const bucketIndex = Math.min(bucketCount - 1, Math.floor((value - min) / bucketSize))
    const bucket = bins[bucketIndex]
    if (bucket) {
      bucket.count += 1
    }
  }

  return bins
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
          <span className="font-mono font-medium">{entry.payload.label}</span>
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
  const shouldReduceMotion = useShouldReduceMotion()

  const distributions = useMemo(() => {
    if (data.length < 2) return []

    const costs = data.map((entry) => entry.totalCost)
    const requests = data.map((entry) => entry.requestCount)
    const tokensPerRequest = data.map((entry) =>
      entry.requestCount > 0 ? entry.totalTokens / entry.requestCount : 0,
    )

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
        title: t('charts.distribution.tokensPerRequest'),
        data: toBins(tokensPerRequest, formatTokens),
      },
    ]
  }, [data, viewMode, t])

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <InfoHeading info={CHART_HELP.distributionAnalysis}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('charts.distribution.title')}
            </CardTitle>
          </InfoHeading>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            {t('charts.distribution.requiresData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <InfoHeading info={CHART_HELP.distributionAnalysis}>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('charts.distribution.title')}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="space-y-5">
        {distributions.map((distribution, index) => (
          <div key={distribution.title}>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {distribution.title}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {distribution.data.length} {t('charts.distribution.buckets')}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={distribution.data} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id={`${uid}-distribution-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.25} />
                  <XAxis
                    dataKey="label"
                    stroke={CHART_COLORS.axis}
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={distribution.data.length > 5 ? -16 : 0}
                    textAnchor={distribution.data.length > 5 ? 'end' : 'middle'}
                    height={distribution.data.length > 5 ? 48 : 30}
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
                    isAnimationActive={!shouldReduceMotion}
                    animationBegin={CHART_ANIMATION.stagger * index}
                    animationDuration={CHART_ANIMATION.duration}
                  >
                    {distribution.data.map((_, binIndex) => {
                      const intensity =
                        distribution.data.length > 1 ? binIndex / (distribution.data.length - 1) : 0
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
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
