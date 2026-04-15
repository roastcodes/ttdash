import {
  DollarSign,
  Coins,
  Calendar,
  Cpu,
  Database,
  TrendingDown,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardMotionItem } from '@/components/dashboard/dashboard-motion'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatCurrency, formatPercent, formatTokens, periodUnit } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import { getCurrentLocale } from '@/lib/i18n'
import type { DashboardMetrics, ViewMode } from '@/types'

interface PrimaryMetricsProps {
  metrics: DashboardMetrics
  totalCalendarDays?: number
  viewMode?: ViewMode
}

/** Renders the primary dashboard KPI cards. */
export function PrimaryMetrics({
  metrics,
  totalCalendarDays,
  viewMode = 'daily',
}: PrimaryMetricsProps) {
  const { t } = useTranslation()
  const locale = getCurrentLocale()
  // Calculate input/output ratio
  const ioRatio =
    metrics.totalInput > 0 && metrics.totalOutput > 0
      ? new Intl.NumberFormat(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(metrics.totalInput / metrics.totalOutput)
      : null

  const coverageRate =
    totalCalendarDays && viewMode === 'daily'
      ? (metrics.activeDays / totalCalendarDays) * 100
      : null
  const topModelSubtitle = metrics.topModel
    ? `${formatCurrency(metrics.topModel.cost)} · ${t('metricCards.primary.share', { value: formatPercent(metrics.topModelShare, 0) })}${metrics.topRequestModel ? ` · ${t('metricCards.primary.requestLead', { value: metrics.topRequestModel.name })}` : ''}`
    : null
  const cacheHitRateSubtitle =
    metrics.totalTokens > 0
      ? t('metricCards.primary.allTokensViaCacheRead', {
          value: formatPercent((metrics.totalCacheRead / metrics.totalTokens) * 100),
        })
      : null
  const thinkingInsight =
    metrics.totalTokens > 0
      ? t('metricCards.primary.thinkingShareOfVolume', {
          value: formatPercent((metrics.totalThinking / metrics.totalTokens) * 100),
        })
      : null
  const thinkingSubtitle =
    metrics.totalTokens > 0
      ? t('metricCards.primary.thinkingSubtitle', {
          share: formatPercent((metrics.totalThinking / metrics.totalTokens) * 100),
          tokens: formatTokens(metrics.totalThinking / Math.max(metrics.totalRequests, 1)),
        })
      : null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      <DashboardMotionItem order={0}>
        <MetricCard
          label={t('metricCards.primary.totalCost')}
          value={
            <FormattedValue
              value={metrics.totalCost}
              type="currency"
              label={t('metricCards.primary.totalCost')}
              insight={t('metricCards.primary.avgPerPeriod', {
                value: formatCurrency(metrics.avgDailyCost),
                unit: periodUnit(viewMode),
              })}
            />
          }
          subtitle={t('metricCards.primary.totalCostSubtitle', {
            average: formatCurrency(metrics.avgDailyCost),
            unit: periodUnit(viewMode),
            costPerRequest: formatCurrency(metrics.avgCostPerRequest),
          })}
          icon={<DollarSign className="h-4 w-4" />}
          trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
          info={METRIC_HELP.totalCost}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={1}>
        <MetricCard
          label={t('metricCards.primary.totalTokens')}
          value={
            <FormattedValue
              value={metrics.totalTokens}
              type="tokens"
              label={t('metricCards.primary.totalTokens')}
              insight={t('metricCards.primary.tokensPerRequestAvg', {
                value: formatTokens(metrics.avgTokensPerRequest),
              })}
            />
          }
          subtitle={
            ioRatio
              ? t('metricCards.primary.totalTokensSubtitleWithRatio', {
                  ratio: ioRatio,
                  tokensPerRequest: formatTokens(metrics.avgTokensPerRequest),
                })
              : t('metricCards.primary.totalTokensSubtitle', {
                  tokensPerRequest: formatTokens(metrics.avgTokensPerRequest),
                })
          }
          icon={<Coins className="h-4 w-4" />}
          info={METRIC_HELP.totalTokens}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={2}>
        <MetricCard
          label={t('metricCards.primary.activeDays')}
          value={String(metrics.activeDays)}
          subtitle={
            coverageRate !== null
              ? t('metricCards.primary.coverageOfDays', {
                  coverage: formatPercent(coverageRate, 0),
                  days: totalCalendarDays,
                })
              : t('metricCards.primary.providersActive', { count: metrics.providerCount })
          }
          icon={<Calendar className="h-4 w-4" />}
          info={METRIC_HELP.activeDays}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={3}>
        <MetricCard
          label={t('metricCards.primary.topModel')}
          value={metrics.topModel?.name ?? '–'}
          icon={<Cpu className="h-4 w-4" />}
          info={METRIC_HELP.topModel}
          {...(topModelSubtitle ? { subtitle: topModelSubtitle } : {})}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={4}>
        <MetricCard
          label={t('metricCards.primary.cacheHitRate')}
          value={<FormattedValue value={metrics.cacheHitRate} type="percent" />}
          icon={<Database className="h-4 w-4" />}
          info={METRIC_HELP.cacheHitRate}
          {...(cacheHitRateSubtitle ? { subtitle: cacheHitRateSubtitle } : {})}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={5}>
        <MetricCard
          label={t('metricCards.primary.costPerMillion')}
          value={<FormattedValue value={metrics.costPerMillion} type="currency" />}
          icon={<TrendingDown className="h-4 w-4" />}
          info={METRIC_HELP.costPerMillion}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={6}>
        <MetricCard
          label={t('metricCards.primary.requests')}
          value={
            metrics.hasRequestData ? (
              <FormattedValue
                value={metrics.totalRequests}
                type="number"
                label={t('metricCards.primary.requests')}
                insight={t('insights.requestEconomy.summary', {
                  cost: formatCurrency(metrics.avgCostPerRequest),
                  tokens: formatTokens(metrics.avgTokensPerRequest),
                  leader: '',
                }).trim()}
              />
            ) : (
              t('common.notAvailable')
            )
          }
          subtitle={
            metrics.hasRequestData
              ? t('metricCards.primary.requestsSubtitle', {
                  requests: metrics.avgRequestsPerDay.toFixed(1),
                  unit: periodUnit(viewMode),
                  cost: formatCurrency(metrics.avgCostPerRequest),
                  volatility: Math.round(metrics.requestVolatility),
                })
              : t('metricCards.primary.requestCountersMissing')
          }
          icon={<Activity className="h-4 w-4" />}
        />
      </DashboardMotionItem>
      <DashboardMotionItem order={7}>
        <MetricCard
          label={t('metricCards.primary.thinking')}
          value={
            <FormattedValue
              value={metrics.totalThinking}
              type="tokens"
              label={t('metricCards.primary.thinking')}
              {...(thinkingInsight ? { insight: thinkingInsight } : {})}
            />
          }
          icon={<BrainCircuit className="h-4 w-4" />}
          {...(thinkingSubtitle ? { subtitle: thinkingSubtitle } : {})}
        />
      </DashboardMotionItem>
    </div>
  )
}
