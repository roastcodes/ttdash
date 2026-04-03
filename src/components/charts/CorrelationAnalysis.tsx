import { useMemo, useRef } from 'react'
import { useInView } from 'framer-motion'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { InfoButton } from '@/components/features/help/InfoButton'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatDate, formatPercent, formatTokens } from '@/lib/formatters'
import type { DailyUsage } from '@/types'

interface CorrelationAnalysisProps {
  data: DailyUsage[]
}

interface ScatterPoint {
  x: number
  y: number
  z: number
  label: string
  tokens?: number
  requests?: number
  cacheRate?: number
}

function correlation(valuesA: number[], valuesB: number[]) {
  if (valuesA.length !== valuesB.length || valuesA.length < 2) return 0
  const avgA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length
  const avgB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length
  const covariance = valuesA.reduce((sum, value, index) => sum + (value - avgA) * (valuesB[index] - avgB), 0)
  const varianceA = valuesA.reduce((sum, value) => sum + (value - avgA) ** 2, 0)
  const varianceB = valuesB.reduce((sum, value) => sum + (value - avgB) ** 2, 0)
  if (varianceA === 0 || varianceB === 0) return 0
  return covariance / Math.sqrt(varianceA * varianceB)
}

function ScatterTooltip({ active, payload, mode }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }>; mode: 'requestCost' | 'cacheEfficiency' }) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload

  return (
    <div className="max-w-[260px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{formatDate(point.label)}</p>
      <div className="space-y-1">
        {mode === 'requestCost' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Requests</span>
              <span className="font-mono font-medium">{point.requests?.toLocaleString('de-CH') ?? '–'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Kosten</span>
              <span className="font-mono font-medium">{formatCurrency(point.y)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tokens</span>
              <span className="font-mono font-medium">{point.tokens ? formatTokens(point.tokens) : '–'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Cache-Rate</span>
              <span className="font-mono font-medium">{point.cacheRate !== undefined ? formatPercent(point.cacheRate, 1) : '–'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Kosten / Req</span>
              <span className="font-mono font-medium">{formatCurrency(point.y)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Requests</span>
              <span className="font-mono font-medium">{point.requests?.toLocaleString('de-CH') ?? '–'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function CorrelationAnalysis({ data }: CorrelationAnalysisProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.2 })

  if (data.length < 2) {
    return (
      <Card ref={sectionRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Korrelationen
            <InfoButton text={CHART_HELP.correlationAnalysis} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            Für Korrelationen werden mindestens 2 Datenpunkte im aktuellen Filter benötigt.
          </div>
        </CardContent>
      </Card>
    )
  }

  const requestVsCost = useMemo<ScatterPoint[]>(() => data.map(entry => ({
    x: entry.requestCount,
    y: entry.totalCost,
    z: Math.max(5, Math.sqrt(entry.totalTokens / 1000)),
    label: entry.date,
    tokens: entry.totalTokens,
    requests: entry.requestCount,
  })), [data])

  const cacheVsCostPerRequest = useMemo<ScatterPoint[]>(() => data
    .filter(entry => entry.requestCount > 0 && entry.totalTokens > 0)
    .map(entry => {
      const cacheShare = (entry.cacheReadTokens / entry.totalTokens) * 100
      return {
        x: cacheShare,
        y: entry.totalCost / entry.requestCount,
        z: Math.max(5, Math.sqrt(entry.requestCount)),
        label: entry.date,
        cacheRate: cacheShare,
        requests: entry.requestCount,
      }
    }), [data])

  const requestCostCorrelation = correlation(requestVsCost.map(point => point.x), requestVsCost.map(point => point.y))
  const cacheEfficiencyCorrelation = correlation(cacheVsCostPerRequest.map(point => point.x), cacheVsCostPerRequest.map(point => point.y))

  return (
    <Card ref={sectionRef}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Korrelationen
          <InfoButton text={CHART_HELP.correlationAnalysis} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeIn delay={0.02} duration={0.45} direction="up">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Requests vs. Kosten</div>
            <div className="text-[10px] text-muted-foreground">r {requestCostCorrelation.toFixed(2)} · {requestVsCost.length} Punkte</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.25} />
              <XAxis type="number" dataKey="x" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} name="Requests" />
              <YAxis type="number" dataKey="y" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} name="Kosten" tickFormatter={formatCurrency} />
              <ZAxis type="number" dataKey="z" range={[30, 180]} />
              <Tooltip content={<ScatterTooltip mode="requestCost" />} cursor={{ strokeDasharray: '4 4' }} />
              <Scatter
                data={requestVsCost}
                fill={CHART_COLORS.cost}
                stroke={CHART_COLORS.cost}
                fillOpacity={0.72}
                isAnimationActive={inView}
                animationDuration={CHART_ANIMATION.duration}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-muted-foreground">
            {requestCostCorrelation >= 0.6 ? 'Starker Zusammenhang: Mehr Requests treiben die Kosten sichtbar.' : requestCostCorrelation >= 0.3 ? 'Moderater Zusammenhang zwischen Last und Kosten.' : 'Schwacher Zusammenhang: Kosten werden stärker von Modellmix und Tokenlast geprägt.'}
          </div>
        </div>
        </FadeIn>

        <FadeIn delay={0.08} duration={0.45} direction="up">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cache-Rate vs. $/Req</div>
            <div className="text-[10px] text-muted-foreground">r {cacheEfficiencyCorrelation.toFixed(2)} · {cacheVsCostPerRequest.length} Punkte</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.25} />
              <XAxis type="number" dataKey="x" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} name="Cache-Rate" tickFormatter={(value) => formatPercent(value, 0)} />
              <YAxis type="number" dataKey="y" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} name="$/Req" tickFormatter={formatCurrency} />
              <ZAxis type="number" dataKey="z" range={[30, 180]} />
              <Tooltip content={<ScatterTooltip mode="cacheEfficiency" />} cursor={{ strokeDasharray: '4 4' }} />
              <Scatter
                data={cacheVsCostPerRequest}
                fill={CHART_COLORS.cumulative}
                stroke={CHART_COLORS.cumulative}
                fillOpacity={0.72}
                isAnimationActive={inView}
                animationBegin={CHART_ANIMATION.stagger}
                animationDuration={CHART_ANIMATION.duration}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-muted-foreground">
            {cacheEfficiencyCorrelation <= -0.3 ? 'Negativer Zusammenhang: Höhere Cache-Rate senkt tendenziell die Kosten pro Request.' : cacheEfficiencyCorrelation < 0.2 ? 'Kaum linearer Effekt: Cache wirkt, aber nicht allein entscheidend.' : 'Positiver Zusammenhang: Hohe Cache-Raten fallen hier nicht automatisch mit niedrigen Kosten pro Request zusammen.'}
          </div>
        </div>
        </FadeIn>
      </CardContent>
    </Card>
  )
}
