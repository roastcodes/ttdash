import { useId, useMemo, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { InfoButton } from '@/components/features/help/InfoButton'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatTokens, periodLabel } from '@/lib/formatters'
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
    bins[bucketIndex].count += 1
  }

  return bins
}

function DistributionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DistributionBin }> }) {
  if (!active || !payload?.length) return null

  const entry = payload[0]

  return (
    <div className="max-w-[280px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{entry.payload.label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Intervall</span>
          <span className="font-mono font-medium">{entry.payload.label}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Datenpunkte</span>
          <span className="font-mono font-medium">{formatNumber(entry.value)}</span>
        </div>
      </div>
    </div>
  )
}

export function DistributionAnalysis({ data, viewMode = 'daily' }: DistributionAnalysisProps) {
  const [activeIndices, setActiveIndices] = useState<Record<number, number | null>>({})
  const uid = useId().replace(/:/g, '')
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.2 })

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Verteilungen
            <InfoButton text={CHART_HELP.distributionAnalysis} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            Für Verteilungen werden mindestens 2 Datenpunkte im aktuellen Filter benötigt.
          </div>
        </CardContent>
      </Card>
    )
  }

  const distributions = useMemo(() => {
    const costs = data.map(entry => entry.totalCost)
    const requests = data.map(entry => entry.requestCount)
    const tokensPerRequest = data.map(entry => entry.requestCount > 0 ? entry.totalTokens / entry.requestCount : 0)

    return [
      { title: `Kosten je ${periodLabel(viewMode)}`, data: toBins(costs, formatCurrency) },
      { title: `Requests je ${periodLabel(viewMode)}`, data: toBins(requests, formatNumber) },
      { title: 'Tokens pro Request', data: toBins(tokensPerRequest, formatTokens) },
    ]
  }, [data, viewMode])

  return (
      <Card ref={sectionRef}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Verteilungen
          <InfoButton text={CHART_HELP.distributionAnalysis} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {distributions.map((distribution, index) => (
          <FadeIn key={distribution.title} delay={0.04 * index} duration={0.45} direction="up">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{distribution.title}</div>
                <div className="text-[10px] text-muted-foreground">{distribution.data.length} Buckets</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={distribution.data}
                  margin={CHART_MARGIN}
                  onMouseMove={(state) => {
                    setActiveIndices((current) => ({
                      ...current,
                      [index]: typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : null,
                    }))
                  }}
                  onMouseLeave={() => {
                    setActiveIndices((current) => ({
                      ...current,
                      [index]: null,
                    }))
                  }}
                >
                  <defs>
                    <linearGradient id={`${uid}-distribution-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id={`${uid}-distribution-active-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.65} />
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
                  <YAxis stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<DistributionTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={inView} animationBegin={index * CHART_ANIMATION.stagger} animationDuration={CHART_ANIMATION.duration}>
                    {distribution.data.map((bin, binIndex) => {
                      const intensity = distribution.data.length > 1 ? binIndex / (distribution.data.length - 1) : 0
                      const opacity = 0.45 + intensity * 0.35
                      const fill = activeIndices[index] === binIndex
                        ? `url(#${uid}-distribution-active-${index})`
                        : `hsla(215, 70%, 55%, ${opacity.toFixed(2)})`
                      return <Cell key={`${distribution.title}-${binIndex}`} fill={fill} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FadeIn>
        ))}
      </CardContent>
    </Card>
  )
}
