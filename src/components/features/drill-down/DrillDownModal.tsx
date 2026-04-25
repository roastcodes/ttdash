import { useMemo, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { getRadialAnimationProps } from '@/components/charts/chart-theme'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatTokens,
} from '@/lib/formatters'
import { FormattedValue } from '@/components/ui/formatted-value'
import { AnimatedSegmentedBar } from '@/components/ui/AnimatedSegmentedBar'
import { getProviderBadgeClasses } from '@/lib/model-utils'
import { useModelColorHelpers } from '@/lib/model-color-context'
import { useShouldReduceMotion } from '@/lib/motion'
import { cn } from '@/lib/cn'
import {
  deriveDrillDownData,
  getDelta,
  type DrillDownDelta,
  type DrillDownTokenSegmentId,
} from '@/lib/drill-down-data'
import type { DailyUsage } from '@/types'

interface DrillDownModalProps {
  day: DailyUsage | null
  contextData?: DailyUsage[]
  open: boolean
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalCount?: number
  onPrevious?: () => void
  onNext?: () => void
  onClose: () => void
}

function formatDeltaValue(
  delta: DrillDownDelta | null,
  formatter: (value: number) => string,
  fallback = '–',
) {
  if (!delta) return fallback
  if (delta.absolute === 0) return `→ ${formatter(0)}`

  return `${delta.absolute > 0 ? '↑' : '↓'} ${formatter(Math.abs(delta.absolute))}`
}

function formatDeltaPercent(delta: DrillDownDelta | null, fallback = '–') {
  if (!delta) return fallback
  if (delta.percent === null) return fallback
  if (delta.percent === 0) return '0.0%'

  return `${delta.percent > 0 ? '+' : ''}${delta.percent.toFixed(1)}%`
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

function getBenchmarkWindowLabel(count: number, unitLabel: string) {
  return `${count}${unitLabel}`
}

function getTokenSegmentLabelKey(id: DrillDownTokenSegmentId) {
  switch (id) {
    case 'cacheRead':
      return 'drillDown.tokenSegments.cacheRead'
    case 'cacheWrite':
      return 'drillDown.tokenSegments.cacheWrite'
    case 'input':
      return 'common.input'
    case 'output':
      return 'common.output'
    case 'thinking':
      return 'common.thinking'
  }
}

/** Renders the per-period drilldown dialog with navigation and benchmarks. */
export function DrillDownModal({
  day,
  contextData = [],
  open,
  hasPrevious: hasPreviousProp,
  hasNext: hasNextProp,
  currentIndex: currentIndexProp,
  totalCount: totalCountProp,
  onPrevious,
  onNext,
  onClose,
}: DrillDownModalProps) {
  const { t } = useTranslation()
  const { getModelColor } = useModelColorHelpers()
  const shouldReduceMotion = useShouldReduceMotion()

  const drillDownData = useMemo(
    () => (day ? deriveDrillDownData(day, contextData) : null),
    [contextData, day],
  )

  if (!day || !drillDownData) return null

  const {
    periodKind,
    sortedContextData,
    contextIndex,
    previousEntry,
    previousSeven,
    tokensTotal,
    hasTokens,
    modelData,
    providerData,
    pieData,
    cacheRate,
    avgTokensPerRequest,
    avgCostPerRequest,
    costPerMillion,
    costRanking,
    requestRanking,
    avgCost7,
    avgRequests7,
    avgTokens7,
    avgCostPerMillion7,
    previousTokens,
    previousCostPerMillion,
    topCostModel,
    topRequestModel,
    topTokenModel,
    priciestPerMillionModel,
    topThreeCostShare,
    tokenSegments,
    tokenDistributionSegments: rawTokenDistributionSegments,
  } = drillDownData

  const hasPrevious = hasPreviousProp ?? contextIndex > 0
  const hasNext = hasNextProp ?? (contextIndex >= 0 && contextIndex < sortedContextData.length - 1)
  const currentIndex = currentIndexProp ?? (contextIndex >= 0 ? contextIndex + 1 : 0)
  const totalCount = totalCountProp ?? sortedContextData.length
  const benchmarkWindowLabel = getBenchmarkWindowLabel(
    previousSeven.length > 0 ? previousSeven.length : 7,
    t(`drillDown.windowUnit.${periodKind}`),
  )

  const summaryCards = [
    { label: t('common.tokens'), value: <FormattedValue value={tokensTotal} type="tokens" /> },
    {
      label: '$/1M',
      value:
        costPerMillion !== null ? <FormattedValue value={costPerMillion} type="currency" /> : '–',
    },
    {
      label: t('common.requests'),
      value: <FormattedValue value={day.requestCount} type="number" />,
    },
    { label: t('common.models'), value: formatNumber(modelData.length) },
    { label: t('drillDown.activeProviders'), value: formatNumber(providerData.length) },
    {
      label: t('drillDown.tokensPerRequest'),
      value:
        avgTokensPerRequest !== null ? (
          <FormattedValue value={avgTokensPerRequest} type="tokens" />
        ) : (
          '–'
        ),
    },
    {
      label: t('drillDown.costPerRequest'),
      value:
        avgCostPerRequest !== null ? (
          <FormattedValue value={avgCostPerRequest} type="currency" />
        ) : (
          '–'
        ),
    },
    {
      label: t('drillDown.cacheRate'),
      value: <FormattedValue value={cacheRate} type="percent" />,
    },
    {
      label: t('common.thinking'),
      value: <FormattedValue value={day.thinkingTokens} type="tokens" />,
    },
    { label: t('drillDown.costRank'), value: costRanking > 0 ? `#${costRanking}` : '–' },
    { label: t('drillDown.requestRank'), value: requestRanking > 0 ? `#${requestRanking}` : '–' },
    {
      label: t('drillDown.coverage'),
      value:
        (day._aggregatedDays ?? 1) > 1
          ? t('drillDown.coverageDays', { count: day._aggregatedDays ?? 1 })
          : t('drillDown.singlePeriod', { period: t(`periods.${periodKind}`) }),
    },
  ]

  const benchmarkCards = [
    {
      label: t('drillDown.costVsPrevious'),
      primary: formatDeltaValue(
        getDelta(day.totalCost, previousEntry?.totalCost ?? null),
        formatCurrency,
      ),
      secondary: formatDeltaPercent(getDelta(day.totalCost, previousEntry?.totalCost ?? null)),
    },
    {
      label: t('drillDown.tokensVsPrevious'),
      primary: formatDeltaValue(getDelta(tokensTotal, previousTokens), formatTokens),
      secondary: formatDeltaPercent(getDelta(tokensTotal, previousTokens)),
    },
    {
      label: t('drillDown.requestsVsPrevious'),
      primary: formatDeltaValue(
        getDelta(day.requestCount, previousEntry?.requestCount ?? null),
        (value) => formatNumber(Math.round(value)),
      ),
      secondary: formatDeltaPercent(
        getDelta(day.requestCount, previousEntry?.requestCount ?? null),
      ),
    },
    {
      label: t('drillDown.costPerMillionVsAverageWindow', { window: benchmarkWindowLabel }),
      primary: formatDeltaValue(
        costPerMillion !== null ? getDelta(costPerMillion, avgCostPerMillion7) : null,
        formatCurrency,
      ),
      secondary: avgCostPerMillion7 !== null ? formatCurrency(avgCostPerMillion7) : '–',
    },
    {
      label: t('drillDown.costVsAverageWindow', { window: benchmarkWindowLabel }),
      primary: formatDeltaValue(getDelta(day.totalCost, avgCost7), formatCurrency),
      secondary: avgCost7 !== null ? formatCurrency(avgCost7) : '–',
    },
    {
      label: t('drillDown.requestsVsAverageWindow', { window: benchmarkWindowLabel }),
      primary: formatDeltaValue(getDelta(day.requestCount, avgRequests7), (value) =>
        formatNumber(Math.round(value)),
      ),
      secondary: avgRequests7 !== null ? formatNumber(Math.round(avgRequests7)) : '–',
    },
    {
      label: t('drillDown.tokensVsAverageWindow', { window: benchmarkWindowLabel }),
      primary: formatDeltaValue(getDelta(tokensTotal, avgTokens7), formatTokens),
      secondary: avgTokens7 !== null ? formatTokens(avgTokens7) : '–',
    },
    {
      label: t('drillDown.costPerMillionVsPrevious'),
      primary: formatDeltaValue(
        costPerMillion !== null ? getDelta(costPerMillion, previousCostPerMillion) : null,
        formatCurrency,
      ),
      secondary: previousCostPerMillion !== null ? formatCurrency(previousCostPerMillion) : '–',
    },
  ]

  const tokenDistributionSegments = rawTokenDistributionSegments.map((segment) => {
    const label = t(getTokenSegmentLabelKey(segment.id))
    return {
      id: segment.id,
      width: segment.width,
      color: segment.color,
      label: `${label}: ${formatTokens(segment.value)} (${segment.width.toFixed(1)}%)`,
    }
  })

  const topModelCards = [
    {
      label: t('drillDown.topCostModel'),
      title: topCostModel?.name ?? '–',
      value: topCostModel ? formatPercent(topCostModel.costShare) : '–',
    },
    {
      label: t('drillDown.topRequestModel'),
      title: topRequestModel?.name ?? '–',
      value:
        topRequestModel && topRequestModel.requests > 0
          ? t('drillDown.requestCountShort', { count: topRequestModel.requests })
          : '–',
    },
    {
      label: t('drillDown.topTokenModel'),
      title: topTokenModel?.name ?? '–',
      value: topTokenModel ? formatPercent(topTokenModel.tokenShare) : '–',
    },
    {
      label: t('drillDown.priciestPerMillionModel'),
      title: priciestPerMillionModel?.name ?? '–',
      value:
        priciestPerMillionModel?.costPerMillion !== null &&
        priciestPerMillionModel?.costPerMillion !== undefined ? (
          <FormattedValue value={priciestPerMillionModel.costPerMillion} type="currency" />
        ) : (
          '–'
        ),
    },
    {
      label: t('drillDown.topCostShare'),
      title: topCostModel ? formatPercent(topCostModel.costShare) : '–',
      value: topCostModel?.provider ?? '–',
    },
    {
      label: t('drillDown.topThreeCostShare'),
      title: formatPercent(topThreeCostShare),
      value: t('drillDown.modelCount', { count: Math.min(modelData.length, 3) }),
    },
  ]

  const previousLabel = t(
    periodKind === 'day' ? 'drillDown.previousDay' : 'drillDown.previousPeriod',
  )
  const nextLabel = t(periodKind === 'day' ? 'drillDown.nextDay' : 'drillDown.nextPeriod')

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditableTarget(event.target)
    ) {
      return
    }

    if (event.key === 'ArrowLeft' && hasPrevious) {
      event.preventDefault()
      onPrevious?.()
    }

    if (event.key === 'ArrowRight' && hasNext) {
      event.preventDefault()
      onNext?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        data-testid="drilldown-dialog"
        className="data-[state=closed]:slide-out-to-top-[2rem] data-[state=open]:slide-in-from-top-[2rem] top-6 max-h-[calc(100vh-3rem)] max-w-5xl translate-y-0 overflow-y-auto sm:top-10 sm:max-h-[calc(100vh-5rem)]"
        onKeyDown={handleDialogKeyDown}
      >
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <DialogTitle>
                {formatDate(day.date, 'long')} — {formatCurrency(day.totalCost)}
              </DialogTitle>
              <DialogDescription>
                {t('drillDown.description', { periodType: t(`periods.${periodKind}`) })}
              </DialogDescription>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  aria-label={previousLabel}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{previousLabel}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  disabled={!hasNext}
                  aria-label={nextLabel}
                >
                  <span>{nextLabel}</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                <span>{t('drillDown.position', { current: currentIndex, total: totalCount })}</span>
                <span aria-hidden="true">·</span>
                <span>{t('drillDown.keyboardHint')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-1">
              {t('drillDown.periodType', { period: t(`periods.${periodKind}`) })}
            </span>
            {(day._aggregatedDays ?? 1) > 1 && (
              <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-1">
                {t('drillDown.coverageDays', { count: day._aggregatedDays ?? 1 })}
              </span>
            )}
          </div>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('drillDown.overview')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">{card.label}</div>
                <div className="mt-1 font-mono text-sm font-medium">{card.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('drillDown.benchmarks')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {benchmarkCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2"
              >
                <div className="text-xs text-muted-foreground">{card.label}</div>
                <div className="mt-1 font-medium">{card.primary}</div>
                <div className="mt-1 text-xs text-muted-foreground">{card.secondary}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t('drillDown.modelBreakdown')}</h3>
            <span className="text-xs text-muted-foreground">
              {t('drillDown.modelCount', { count: modelData.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
                {topModelCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2"
                  >
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                    <div className="mt-1 truncate font-medium">{card.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{card.value}</div>
                  </div>
                ))}
              </div>

              {pieData.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t('drillDown.costShareByModel')}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={84}
                        paddingAngle={2}
                        dataKey="value"
                        {...getRadialAnimationProps(!shouldReduceMotion)}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={getModelColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {modelData.map((model) => (
                <div
                  key={model.name}
                  className="rounded-xl border border-border/50 bg-muted/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: getModelColor(model.name) }}
                      />
                      <span className="truncate font-medium">{model.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium',
                          getProviderBadgeClasses(model.provider),
                        )}
                      >
                        {model.provider}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('drillDown.requestCountShort', { count: model.requests })}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('tables.recentDays.cost')}</div>
                      <div className="mt-1 font-mono">
                        <FormattedValue value={model.cost} type="currency" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('drillDown.costShare')}</div>
                      <div className="mt-1 font-mono">{formatPercent(model.costShare)}</div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('tables.recentDays.tokens')}</div>
                      <div className="mt-1 font-mono">
                        <FormattedValue value={model.tokens} type="tokens" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('drillDown.tokenShare')}</div>
                      <div className="mt-1 font-mono">{formatPercent(model.tokenShare)}</div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.requests')}</div>
                      <div className="mt-1 font-mono">
                        <FormattedValue value={model.requests} type="number" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">$/1M</div>
                      <div className="mt-1 font-mono">
                        {model.costPerMillion !== null ? (
                          <FormattedValue value={model.costPerMillion} type="currency" />
                        ) : (
                          '–'
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('drillDown.costPerRequest')}</div>
                      <div className="mt-1 font-mono">
                        {model.costPerRequest !== null ? (
                          <FormattedValue value={model.costPerRequest} type="currency" />
                        ) : (
                          '–'
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg bg-background/70 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('drillDown.tokensPerRequest')}</div>
                      <div className="mt-1 font-mono">
                        {model.tokensPerRequest !== null ? (
                          <FormattedValue value={model.tokensPerRequest} type="tokens" />
                        ) : (
                          '–'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
                    <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.input')}</div>
                      <div className="mt-1 font-mono">{formatTokens(model.input)}</div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.output')}</div>
                      <div className="mt-1 font-mono">{formatTokens(model.output)}</div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.cacheRead')}</div>
                      <div className="mt-1 font-mono">{formatTokens(model.cacheRead)}</div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.cacheWrite')}</div>
                      <div className="mt-1 font-mono">{formatTokens(model.cacheCreate)}</div>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2">
                      <div className="text-muted-foreground">{t('common.thinking')}</div>
                      <div className="mt-1 font-mono">{formatTokens(model.thinking)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t('drillDown.providerSummary')}</h3>
            <span className="text-xs text-muted-foreground">
              {t('drillDown.providerCount', { count: providerData.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {providerData.map((provider) => (
              <div
                key={provider.provider}
                className="rounded-xl border border-border/50 bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-1 text-xs leading-none font-medium',
                      getProviderBadgeClasses(provider.provider),
                    )}
                  >
                    {provider.provider}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('drillDown.activeModelsCount', { count: provider.activeModels })}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-background/70 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('tables.recentDays.cost')}</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={provider.cost} type="currency" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/70 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('drillDown.costShare')}</div>
                    <div className="mt-1 font-mono">{formatPercent(provider.costShare)}</div>
                  </div>
                  <div className="rounded-lg bg-background/70 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('tables.recentDays.tokens')}</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={provider.tokens} type="tokens" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/70 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('common.requests')}</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={provider.requests} type="number" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('drillDown.tokenDistribution')}</h3>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
            <AnimatedSegmentedBar
              className="h-3"
              data-testid="drilldown-token-distribution"
              segments={tokenDistributionSegments}
            />
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
              {tokenSegments.map((segment) => (
                <div key={segment.id} className="rounded-lg bg-background/70 px-2.5 py-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    {t(getTokenSegmentLabelKey(segment.id))}
                  </div>
                  <div className="mt-1 font-mono">{formatTokens(segment.value)}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {hasTokens ? formatPercent((segment.value / tokensTotal) * 100) : '–'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
