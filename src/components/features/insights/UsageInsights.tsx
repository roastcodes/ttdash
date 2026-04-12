import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Building2, Layers3, Sparkles, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { FormattedValue } from '@/components/ui/formatted-value'
import { SECTION_HELP } from '@/lib/help-content'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatTokens,
  periodUnit,
} from '@/lib/formatters'
import type { DashboardMetrics, ViewMode } from '@/types'

interface UsageInsightsProps {
  metrics: DashboardMetrics
  viewMode: ViewMode
  totalCalendarDays?: number
}

interface InsightCardProps {
  title: string
  icon: ReactNode
  value: ReactNode
  summary: string
  details: { label: string; value: ReactNode }[]
}

function InsightCard({ title, icon, value, summary, details }: InsightCardProps) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-2.5 text-muted-foreground">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {detail.label}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">{detail.value}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function UsageInsights({ metrics, viewMode, totalCalendarDays }: UsageInsightsProps) {
  const { t } = useTranslation()
  const coverageRate =
    totalCalendarDays && viewMode === 'daily'
      ? (metrics.activeDays / totalCalendarDays) * 100
      : null

  const usageUnit =
    viewMode === 'yearly'
      ? t('periods.years')
      : viewMode === 'monthly'
        ? t('periods.months')
        : t('periods.days')
  const peakSignal =
    metrics.topThreeModelsShare >= 80
      ? t('insights.peakWindow.signalStrong')
      : metrics.topThreeModelsShare >= 55
        ? t('insights.peakWindow.signalModerate')
        : t('insights.peakWindow.signalWide')

  return (
    <div>
      <SectionHeader
        title={t('dashboard.insights.title')}
        badge={t('dashboard.insights.badge')}
        description={t('dashboard.insights.description')}
        info={SECTION_HELP.insights}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <FadeIn delay={0.03}>
          <InsightCard
            title={t('insights.concentration.title')}
            icon={<Building2 className="h-5 w-5" />}
            value={metrics.topProvider ? formatPercent(metrics.topProvider.share, 0) : '–'}
            summary={
              metrics.topProvider
                ? t('insights.concentration.summary', {
                    provider: metrics.topProvider.name,
                    model: metrics.topModel?.name ?? t('metricCards.primary.topModel'),
                  })
                : t('insights.concentration.fallback')
            }
            details={[
              {
                label: t('insights.concentration.topProvider'),
                value: metrics.topProvider?.name ?? '–',
              },
              { label: t('insights.concentration.topModel'), value: metrics.topModel?.name ?? '–' },
              {
                label: t('insights.concentration.topModelShare'),
                value: formatPercent(metrics.topModelShare, 0),
              },
              {
                label: t('insights.concentration.topThreeModels'),
                value: formatPercent(metrics.topThreeModelsShare, 0),
              },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.08}>
          <InsightCard
            title={t('insights.requestEconomy.title')}
            icon={<Activity className="h-5 w-5" />}
            value={
              metrics.hasRequestData ? (
                <FormattedValue
                  value={metrics.avgCostPerRequest}
                  type="currency"
                  label={t('insights.requestEconomy.valueLabel')}
                  insight={t('metricCards.primary.tokensPerRequestAvg', {
                    value: formatTokens(metrics.avgTokensPerRequest),
                  })}
                />
              ) : (
                t('common.notAvailable')
              )
            }
            summary={
              metrics.hasRequestData
                ? t('insights.requestEconomy.summary', {
                    cost: formatCurrency(metrics.avgCostPerRequest),
                    tokens: formatTokens(metrics.avgTokensPerRequest),
                    leader: metrics.topRequestModel
                      ? t('insights.requestEconomy.leader', { model: metrics.topRequestModel.name })
                      : '',
                  }).trim()
                : t('insights.requestEconomy.fallback')
            }
            details={[
              {
                label: t('insights.requestEconomy.avgRequests', { unit: periodUnit(viewMode) }),
                value: metrics.hasRequestData
                  ? metrics.avgRequestsPerDay.toFixed(1)
                  : t('common.notAvailable'),
              },
              {
                label: t('insights.requestEconomy.avgTokensPerRequest'),
                value: metrics.hasRequestData
                  ? formatTokens(metrics.avgTokensPerRequest)
                  : t('common.notAvailable'),
              },
              {
                label: t('insights.requestEconomy.costPerMillion'),
                value: formatCurrency(metrics.costPerMillion),
              },
              {
                label: t('insights.requestEconomy.totalRequests'),
                value: metrics.hasRequestData
                  ? formatNumber(metrics.totalRequests)
                  : t('common.notAvailable'),
              },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.13}>
          <InsightCard
            title={t('insights.usagePatterns.title')}
            icon={<Layers3 className="h-5 w-5" />}
            value={
              coverageRate !== null
                ? formatPercent(coverageRate, 0)
                : formatNumber(metrics.activeDays)
            }
            summary={
              coverageRate !== null
                ? t('insights.usagePatterns.summaryWithCoverage', {
                    activeDays: metrics.activeDays,
                    totalDays: totalCalendarDays,
                    volatility: formatNumber(Math.round(metrics.requestVolatility)),
                  })
                : t('insights.usagePatterns.summaryWithoutCoverage', {
                    activeDays: metrics.activeDays,
                    unit: usageUnit,
                  })
            }
            details={[
              {
                label: t('insights.usagePatterns.avgModels'),
                value: metrics.avgModelsPerEntry.toFixed(1),
              },
              {
                label: t('insights.usagePatterns.providersActive'),
                value: formatNumber(metrics.providerCount),
              },
              {
                label: t('insights.usagePatterns.weekendShare'),
                value:
                  metrics.weekendCostShare !== null
                    ? formatPercent(metrics.weekendCostShare, 0)
                    : '–',
              },
              {
                label: t('insights.usagePatterns.thinkingShare'),
                value:
                  metrics.totalTokens > 0
                    ? formatPercent((metrics.totalThinking / metrics.totalTokens) * 100, 1)
                    : '–',
              },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.18}>
          <InsightCard
            title={t('insights.peakWindow.title')}
            icon={<TrendingUp className="h-5 w-5" />}
            value={
              metrics.busiestWeek
                ? formatCurrency(metrics.busiestWeek.cost)
                : formatCurrency(metrics.topDay?.cost ?? 0)
            }
            summary={
              metrics.busiestWeek
                ? t('insights.peakWindow.summary', {
                    start: formatDate(metrics.busiestWeek.start),
                    end: formatDate(metrics.busiestWeek.end),
                  })
                : t('insights.peakWindow.fallback')
            }
            details={[
              {
                label: t('insights.peakWindow.peakDay'),
                value: metrics.topDay
                  ? `${formatDate(metrics.topDay.date)} · ${formatCurrency(metrics.topDay.cost)}`
                  : '–',
              },
              {
                label: t('insights.peakWindow.avgPerUnit', { unit: periodUnit(viewMode) }),
                value: formatCurrency(metrics.avgDailyCost),
              },
              {
                label: t('insights.peakWindow.peak7DayAverage'),
                value: metrics.busiestWeek ? formatCurrency(metrics.busiestWeek.cost / 7) : '–',
              },
              { label: t('insights.peakWindow.signal'), value: peakSignal },
            ]}
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.22}>
        <div className="mt-4 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/[0.08] via-transparent to-chart-3/[0.08] px-4 py-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-foreground font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('dashboard.insights.quickRead')}
          </span>
          <span className="ml-2">
            {metrics.topProvider
              ? t('insights.quickRead.summary', {
                  provider: metrics.topProvider.name,
                  providerShare: formatPercent(metrics.topProvider.share, 0),
                  topThreeShare: formatPercent(metrics.topThreeModelsShare, 0),
                  requestLeader: metrics.topRequestModel
                    ? t('insights.quickRead.requestLeader', {
                        requestModel: metrics.topRequestModel.name,
                        tokenModel:
                          metrics.topTokenModel?.name ?? t('metricCards.primary.topModel'),
                      })
                    : '',
                }).trim()
              : t('insights.quickRead.fallback')}
          </span>
        </div>
      </FadeIn>
    </div>
  )
}
