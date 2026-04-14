import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatPercent, formatTokens } from '@/lib/formatters'
import { useShouldReduceMotion } from '@/lib/motion'
import type { DashboardMetrics, ViewMode } from '@/types'

interface RequestQualityProps {
  metrics: DashboardMetrics
  viewMode: ViewMode
}

export function RequestQuality({ metrics, viewMode }: RequestQualityProps) {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.25 })
  const shouldReduceMotion = useShouldReduceMotion()
  const cachePerRequest =
    metrics.totalRequests > 0 ? metrics.totalCacheRead / metrics.totalRequests : 0
  const thinkingPerRequest =
    metrics.totalRequests > 0 ? metrics.totalThinking / metrics.totalRequests : 0
  const inputOutputRatio = metrics.totalOutput > 0 ? metrics.totalInput / metrics.totalOutput : 0
  const requestDensity = metrics.activeDays > 0 ? metrics.totalRequests / metrics.activeDays : 0

  const qualityMetrics = [
    {
      label: t('requestQuality.tokensPerRequest'),
      value: metrics.hasRequestData
        ? formatTokens(metrics.avgTokensPerRequest)
        : t('common.notAvailable'),
      accent: 'var(--chart-2)',
      hint: t('requestQuality.tokensHint'),
      progress: Math.min(metrics.avgTokensPerRequest / 200_000, 1),
    },
    {
      label: t('requestQuality.costPerRequest'),
      value: metrics.hasRequestData
        ? formatCurrency(metrics.avgCostPerRequest)
        : t('common.notAvailable'),
      accent: 'var(--chart-4)',
      hint: t('requestQuality.costHint'),
      progress: Math.min(metrics.avgCostPerRequest / 0.25, 1),
    },
    {
      label: t('requestQuality.cachePerRequest'),
      value: metrics.hasRequestData ? formatTokens(cachePerRequest) : t('common.notAvailable'),
      accent: 'var(--chart-1)',
      hint: t('requestQuality.cacheHint'),
      progress: Math.min(cachePerRequest / 200_000, 1),
    },
    {
      label: t('requestQuality.thinkingPerRequest'),
      value: metrics.hasRequestData ? formatTokens(thinkingPerRequest) : t('common.notAvailable'),
      accent: 'var(--chart-5)',
      hint: t('requestQuality.thinkingHint'),
      progress: Math.min(thinkingPerRequest / 10_000, 1),
    },
  ]

  return (
    <Card ref={sectionRef} className="overflow-visible">
      <CardHeader>
        <InfoHeading info={FEATURE_HELP.requestQuality}>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('requestQuality.title')}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {qualityMetrics.map((item) => (
            <div key={item.label} className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                  style={{
                    backgroundColor: `hsl(${item.accent})`,
                    width:
                      inView || shouldReduceMotion ? `${Math.max(item.progress * 100, 6)}%` : '0%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('requestQuality.requestDensity')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatNumber(Math.round(requestDensity))}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('requestQuality.averagePerActiveUnit', {
                unit:
                  viewMode === 'yearly'
                    ? t('periods.year')
                    : viewMode === 'monthly'
                      ? t('periods.month')
                      : t('periods.day'),
              })}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-3/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('requestQuality.cacheHitRate')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatPercent(metrics.cacheHitRate, 1)}
            </div>
            <div className="text-xs text-muted-foreground">{t('requestQuality.cacheHitHint')}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-4/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('requestQuality.inputOutput')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {inputOutputRatio.toFixed(2)}:1
            </div>
            <div className="text-xs text-muted-foreground">
              {t('requestQuality.inputOutputHint')}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-5/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('requestQuality.topRequestModel')}
            </div>
            <div className="mt-1 text-lg font-semibold truncate">
              {metrics.topRequestModel?.name ?? '–'}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.topRequestModel
                ? `${formatNumber(metrics.topRequestModel.requests)} ${t('common.requests')}`
                : t('requestQuality.noRequestLeader')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
