import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedBarFill } from '@/components/ui/AnimatedBarFill'
import { InfoHeading } from '@/components/ui/info-heading'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatCurrency, formatNumber, formatPercent, formatTokens } from '@/lib/formatters'
import { deriveRequestQualityData } from '@/lib/request-quality-data'
import type { DashboardMetrics, ViewMode } from '@/types'

interface RequestQualityProps {
  metrics: DashboardMetrics
  viewMode: ViewMode
}

/** Renders request-efficiency summary cards for the current slice. */
export function RequestQuality({ metrics, viewMode }: RequestQualityProps) {
  const { t } = useTranslation()
  const requestQualityData = deriveRequestQualityData(metrics, viewMode)

  const qualityMetrics = requestQualityData.qualityMetrics.map((item) => {
    switch (item.id) {
      case 'tokensPerRequest':
        return {
          ...item,
          label: t('requestQuality.tokensPerRequest'),
          value: metrics.hasRequestData ? formatTokens(item.value) : t('common.notAvailable'),
          hint: t('requestQuality.tokensHint'),
        }
      case 'costPerRequest':
        return {
          ...item,
          label: t('requestQuality.costPerRequest'),
          value: metrics.hasRequestData ? formatCurrency(item.value) : t('common.notAvailable'),
          hint: t('requestQuality.costHint'),
        }
      case 'cachePerRequest':
        return {
          ...item,
          label: t('requestQuality.cachePerRequest'),
          value: metrics.hasRequestData ? formatTokens(item.value) : t('common.notAvailable'),
          hint: t('requestQuality.cacheHint'),
        }
      case 'thinkingPerRequest':
        return {
          ...item,
          label: t('requestQuality.thinkingPerRequest'),
          value: metrics.hasRequestData ? formatTokens(item.value) : t('common.notAvailable'),
          hint: t('requestQuality.thinkingHint'),
        }
      default:
        return {
          ...item,
          label: item.id,
          value: t('common.notAvailable'),
          hint: '',
        }
    }
  })

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <InfoHeading info={FEATURE_HELP.requestQuality}>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('requestQuality.title')}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {qualityMetrics.map((item, index) => (
            <div key={item.label} className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {item.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/40">
                <AnimatedBarFill
                  className="h-full rounded-full"
                  order={index}
                  style={{
                    backgroundColor: `hsl(${item.accent})`,
                  }}
                  width={
                    metrics.hasRequestData
                      ? item.progress > 0
                        ? `${Math.max(item.progress * 100, 6)}%`
                        : '0%'
                      : '0%'
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('requestQuality.requestDensity')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatNumber(Math.round(requestQualityData.requestDensity))}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('requestQuality.averagePerActiveUnit', {
                unit: t(`periods.${requestQualityData.averageUnit}`),
              })}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-3/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('requestQuality.cacheHitRate')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatPercent(metrics.cacheHitRate, 1)}
            </div>
            <div className="text-xs text-muted-foreground">{t('requestQuality.cacheHitHint')}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-4/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('requestQuality.inputOutput')}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {requestQualityData.inputOutputRatio.toFixed(2)}:1
            </div>
            <div className="text-xs text-muted-foreground">
              {t('requestQuality.inputOutputHint')}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-chart-5/[0.12] via-transparent to-transparent p-4">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('requestQuality.topRequestModel')}
            </div>
            <div className="mt-1 truncate text-lg font-semibold">
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
