import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPercent, periodUnit } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import { MODEL_PRICES } from '@/lib/constants'
import { Zap } from 'lucide-react'
import { FormattedValue } from '@/components/ui/formatted-value'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { CHART_HELP } from '@/lib/help-content'
import type { DailyUsage, ViewMode } from '@/types'

interface CacheROIProps {
  data: DailyUsage[]
  viewMode?: ViewMode
}

/** Renders the cache savings versus no-cache cost comparison. */
export function CacheROI({ data, viewMode = 'daily' }: CacheROIProps) {
  const { t } = useTranslation()
  const { actualCost, hypotheticalCost, savings, savingsPercent, dailyAvg, heuristicModels } =
    useMemo(() => {
      let actual = 0
      let hypothetical = 0
      const heuristicModels = new Set<string>()

      for (const d of data) {
        actual += d.totalCost

        for (const mb of d.modelBreakdowns) {
          const name = normalizeModelName(mb.modelName)
          const prices = MODEL_PRICES[name]
          if (!prices) {
            // If no pricing info, assume cache read saves ~90% vs input
            heuristicModels.add(name)
            hypothetical += mb.cost + (mb.cacheReadTokens / 1_000_000) * 10
            continue
          }
          // What it would have cost if cache reads were regular input tokens
          const cacheReadAsInput = (mb.cacheReadTokens / 1_000_000) * prices.input
          const actualCacheReadCost = (mb.cacheReadTokens / 1_000_000) * prices.cacheRead
          hypothetical += mb.cost - actualCacheReadCost + cacheReadAsInput
        }
      }

      const saved = hypothetical - actual
      const pct = hypothetical > 0 ? (saved / hypothetical) * 100 : 0
      const totalPeriods = data.reduce((s, d) => s + (d._aggregatedDays ?? 1), 0)
      const dailyAvg = totalPeriods > 0 ? actual / totalPeriods : 0

      return {
        actualCost: actual,
        hypotheticalCost: hypothetical,
        savings: saved,
        savingsPercent: pct,
        dailyAvg,
        heuristicModels: Array.from(heuristicModels).sort(),
      }
    }, [data])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground/30" />
            {t('cacheRoi.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{t('cacheRoi.noData')}</p>
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
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            {t('cacheRoi.title')}
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent className="space-y-4">
        {heuristicModels.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/12 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {t('cacheRoi.heuristicFallback', {
              count: heuristicModels.length,
              modelsLabel:
                heuristicModels.length === 1 ? t('cacheRoi.model') : t('cacheRoi.models'),
            })}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{t('cacheRoi.withoutCache')}</div>
            <div className={`text-lg font-bold ${withoutCacheTextClass}`}>
              <FormattedValue value={hypotheticalCost} type="currency" />
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
              <FormattedValue value={savings} type="currency" />
              <span className={`ml-1 text-xs ${withCacheTextClass}`}>
                ({formatPercent(savingsPercent)})
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
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24">{t('cacheRoi.withoutCache')}</span>
            <div className={`h-6 flex-1 overflow-hidden rounded-md ${barTrackDangerClass}`}>
              <div
                className={`h-full rounded-md ${barFillDangerClass}`}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24">{t('cacheRoi.withCache')}</span>
            <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden flex">
              <div
                className={`h-full rounded-l-md ${hasPositiveSavings ? barFillSuccessClass : barFillDangerClass} transition-all duration-1000 motion-reduce:transition-none`}
                style={{ width: `${barWidth}%` }}
              />
              <div
                className={`h-full flex-1 rounded-r-md ${hasPositiveSavings ? barSavedSegmentClass : 'bg-muted/10'}`}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${barFillSuccessClass}`} /> {t('cacheRoi.paid')}
            </span>
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${barSavedSwatchClass}`} /> {t('cacheRoi.saved')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
