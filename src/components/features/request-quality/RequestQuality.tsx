import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercent, formatTokens } from '@/lib/formatters'
import type { DashboardMetrics, ViewMode } from '@/types'

interface RequestQualityProps {
  metrics: DashboardMetrics
  viewMode: ViewMode
}

export function RequestQuality({ metrics, viewMode }: RequestQualityProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.25 })
  const cachePerRequest = metrics.totalRequests > 0 ? metrics.totalCacheRead / metrics.totalRequests : 0
  const thinkingPerRequest = metrics.totalRequests > 0 ? metrics.totalThinking / metrics.totalRequests : 0
  const inputOutputRatio = metrics.totalOutput > 0 ? metrics.totalInput / metrics.totalOutput : 0
  const requestDensity = metrics.activeDays > 0 ? metrics.totalRequests / metrics.activeDays : 0

  const qualityMetrics = [
    {
      label: 'Tokens / Req',
      value: metrics.hasRequestData ? formatTokens(metrics.avgTokensPerRequest) : 'n/v',
      accent: 'var(--chart-2)',
      hint: 'Durchschnittliche Tokenlast pro Anfrage',
      progress: Math.min(metrics.avgTokensPerRequest / 200_000, 1),
    },
    {
      label: 'Kosten / Req',
      value: metrics.hasRequestData ? formatCurrency(metrics.avgCostPerRequest) : 'n/v',
      accent: 'var(--chart-4)',
      hint: 'Direkte Kosten pro Anfrage',
      progress: Math.min(metrics.avgCostPerRequest / 0.25, 1),
    },
    {
      label: 'Cache / Req',
      value: metrics.hasRequestData ? formatTokens(cachePerRequest) : 'n/v',
      accent: 'var(--chart-1)',
      hint: 'Gelesene Cache-Tokens pro Anfrage',
      progress: Math.min(cachePerRequest / 200_000, 1),
    },
    {
      label: 'Thinking / Req',
      value: metrics.hasRequestData ? formatTokens(thinkingPerRequest) : 'n/v',
      accent: 'var(--chart-5)',
      hint: 'Thinking-Tokens pro Anfrage',
      progress: Math.min(thinkingPerRequest / 10_000, 1),
    },
  ]

  return (
    <Card ref={sectionRef} className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Request-Qualität</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {qualityMetrics.map((item) => (
            <motion.div
              key={item.label}
              className="rounded-xl border border-border/50 bg-muted/15 p-3"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/40">
                <motion.div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ backgroundColor: `hsl(${item.accent})` }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${Math.max(item.progress * 100, 6)}%` } : { width: 0 }}
                  transition={{ duration: 0.7, delay: 0.08 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/[0.12] via-transparent to-transparent p-4" initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Request-Dichte</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(Math.round(requestDensity))}</div>
            <div className="text-xs text-muted-foreground">Ø pro aktivem {viewMode === 'yearly' ? 'Jahr' : viewMode === 'monthly' ? 'Monat' : 'Tag'}</div>
          </motion.div>
          <motion.div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-3/[0.12] via-transparent to-transparent p-4" initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.35, delay: 0.14 }}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cache-Hit-Rate</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatPercent(metrics.cacheHitRate, 1)}</div>
            <div className="text-xs text-muted-foreground">Direkt aus Cache-Read relativ zu allen Tokens</div>
          </motion.div>
          <motion.div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-4/[0.12] via-transparent to-transparent p-4" initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.35, delay: 0.18 }}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Input / Output</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{inputOutputRatio.toFixed(2)}:1</div>
            <div className="text-xs text-muted-foreground">Drift zwischen eingehenden und erzeugten Tokens</div>
          </motion.div>
          <motion.div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-5/[0.12] via-transparent to-transparent p-4" initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.35, delay: 0.22 }}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top Request-Modell</div>
            <div className="mt-1 text-lg font-semibold truncate">{metrics.topRequestModel?.name ?? '–'}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.topRequestModel ? `${formatNumber(metrics.topRequestModel.requests)} Requests` : 'Kein Request-Leader'}
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
