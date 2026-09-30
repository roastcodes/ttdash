import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent, periodUnit } from '@/lib/formatters'
import { computeCacheROI } from '@/lib/cache-roi-data'
import { PRICING_CHECKED_AT } from '@/lib/model-pricing'
import { Zap } from 'lucide-react'
import { FormattedValue } from '@/components/ui/formatted-value'
import { AnimatedBarFill } from '@/components/ui/AnimatedBarFill'
import { InfoHeading } from '@/components/ui/info-heading'
import { CHART_HELP } from '@/lib/help-content'
import type { DailyUsage, ViewMode } from '@/types'

interface CacheROIProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

/** Renders the cache savings versus no-cache cost comparison. */
export function CacheROI({ data, viewMode = 'daily' }: CacheROIProps) {
  const { t } = useTranslation()
  const estimate = useMemo(() => computeCacheROI(data), [data])
  const {
    actualCost,
    hypotheticalMin: hypotheticalCost,
    savingsMin: savings,
    averagePerPeriod: dailyAvg,
  } = estimate
  const savingsPercent = hypotheticalCost > 0 ? (savings / hypotheticalCost) * 100 : 0

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-muted-foreground/30" />
            {t('cacheRoi.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">{t('cacheRoi.noData')}</p>
        </CardContent>
      </Card>
    )
  }

  const savingsSign = Math.sign(savings)
  const hasPositiveSavings = savingsSign > 0
  const barWidth = Math.max(
    0,
    Math.min(100, hypotheticalCost > 0 ? (actualCost / hypotheticalCost) * 100 : 100),
  )
  const savedWidth = Math.max(0, 100 - barWidth)
  const withoutCacheTextClass = 'text-rose-700 dark:text-rose-300'
  const withCacheTextClass =
    savingsSign < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
  const barTrackDangerClass = 'bg-rose-500/12 dark:bg-rose-500/18'
  const barFillDangerClass = 'bg-rose-500/60 dark:bg-rose-400/60'
  const barFillSuccessClass = 'bg-emerald-500/65 dark:bg-emerald-400/60'
  const barSavedSegmentClass =
    'bg-emerald-500/12 dark:bg-emerald-400/16 border-l border-emerald-500/35 dark:border-emerald-400/30 border-dashed'
  const barSavedSwatchClass =
    'bg-emerald-500/12 dark:bg-emerald-400/16 border border-emerald-500/35 dark:border-emerald-400/30 border-dashed'

  return (
    <Card>
      <CardHeader className="pb-2">
        <InfoHeading info={CHART_HELP.cacheROI}>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-yellow-500" />
            {t('cacheRoi.title')}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t('cacheRoi.coverage', {
            cost: formatPercent(estimate.costCoverage),
            tokens: formatPercent(estimate.tokenCoverage),
            date: PRICING_CHECKED_AT,
          })}
        </p>
        <p className="text-xs text-muted-foreground">{t('cacheRoi.standardPriceAssumption')}</p>
        {estimate.hasRange && (
          <p className="text-xs text-muted-foreground">{t('cacheRoi.ttlRange')}</p>
        )}
        {estimate.unsupportedModels.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('cacheRoi.unsupported', { models: estimate.unsupportedModels.join(', ') })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">{t('cacheRoi.withoutCache')}</div>
            <div className={`text-lg font-bold ${withoutCacheTextClass}`}>
              {estimate.hasEstimate ? (
                estimate.hasRange ? (
                  `${formatCurrency(hypotheticalCost)} – ${formatCurrency(estimate.hypotheticalMax)}`
                ) : (
                  <FormattedValue value={hypotheticalCost} type="currency" />
                )
              ) : (
                t('common.notAvailable')
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('cacheRoi.withCacheActual')}</div>
            <div className={`text-lg font-bold ${withCacheTextClass}`}>
              <FormattedValue value={actualCost} type="currency" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('cacheRoi.savings')}</div>
            <div className={`text-lg font-bold ${withCacheTextClass}`}>
              {estimate.hasEstimate ? (
                estimate.hasRange ? (
                  `${formatCurrency(savings)} – ${formatCurrency(estimate.savingsMax)}`
                ) : (
                  <FormattedValue value={savings} type="currency" />
                )
              ) : (
                t('common.notAvailable')
              )}
              <span className={`ml-1 text-xs ${withCacheTextClass}`}>
                {estimate.hasEstimate && !estimate.hasRange
                  ? `(${formatPercent(savingsPercent)})`
                  : ''}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t('cacheRoi.avgCostPerUnit', { unit: periodUnit(viewMode) })}
            </div>
            <div className="text-lg font-bold text-foreground">
              <FormattedValue value={dailyAvg} type="currency" />
            </div>
          </div>
        </div>

        {/* Visual bar comparison */}
        {estimate.hasEstimate && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-muted-foreground">{t('cacheRoi.withoutCache')}</span>
              <div className={`h-6 flex-1 overflow-hidden rounded-md ${barTrackDangerClass}`}>
                <AnimatedBarFill
                  className={`h-full rounded-md ${barFillDangerClass}`}
                  width="100%"
                  order={0}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-muted-foreground">{t('cacheRoi.withCache')}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/20">
                <AnimatedBarFill
                  className={`absolute inset-y-0 left-0 rounded-l-md ${hasPositiveSavings ? barFillSuccessClass : barFillDangerClass}`}
                  width={`${barWidth}%`}
                  order={0}
                />
                {hasPositiveSavings && savedWidth > 0 ? (
                  <AnimatedBarFill
                    className={`absolute inset-y-0 rounded-r-md ${barSavedSegmentClass}`}
                    style={{ left: `${barWidth}%` }}
                    width={`${savedWidth}%`}
                    order={1}
                  />
                ) : (
                  <div className="absolute inset-y-0 right-0 left-0 bg-muted/10" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${barFillSuccessClass}`} />{' '}
                {t('cacheRoi.paid')}
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${barSavedSwatchClass}`} />{' '}
                {t('cacheRoi.saved')}
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs">
          {estimate.sources.map(([provider, source]) => (
            <a key={provider} href={source} target="_blank" rel="noreferrer" className="underline">
              {provider}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
