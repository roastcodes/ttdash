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
import { DashboardMotionItem } from '@/components/dashboard/DashboardMotion'
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
  group?: 'primary' | 'details' | 'all'
}

/** Renders the primary dashboard KPI cards. */
export function PrimaryMetrics({
  metrics,
  totalCalendarDays,
  viewMode = 'daily',
  group = 'all',
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
      ? t('metricCards.primary.inputTokensViaCacheRead', {
          value: formatPercent(metrics.inputCacheHitRate),
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
          tokens:
            metrics.knownRequests > 0
              ? formatTokens(metrics.knownRequestThinking / metrics.knownRequests)
              : t('common.notAvailable'),
        })
      : null

  const cards = [
    <DashboardMotionItem key={0} order={0}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.totalCost')}
        value={
          <FormattedValue
            value={metrics.totalCost}
            type="currency"
            label={t('metricCards.primary.totalCost')}
            insight={t('metricCards.primary.avgPerPeriod', {
              value: formatCurrency(
                viewMode === 'daily' ? metrics.avgDailyCost : metrics.avgCostPerPeriod,
              ),
              unit: viewMode === 'daily' ? t('common.activeDay') : periodUnit(viewMode),
            })}
          />
        }
        subtitle={t('metricCards.primary.totalCostSubtitle', {
          average: formatCurrency(
            viewMode === 'daily' ? metrics.avgDailyCost : metrics.avgCostPerPeriod,
          ),
          unit: viewMode === 'daily' ? t('common.activeDay') : periodUnit(viewMode),
          costPerRequest:
            metrics.knownRequests > 0
              ? formatCurrency(metrics.avgCostPerRequest)
              : t('common.notAvailable'),
        })}
        icon={<DollarSign className="h-4 w-4" />}
        trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
        info={METRIC_HELP.totalCost}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={1} order={1}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.totalTokens')}
        value={
          <FormattedValue
            value={metrics.totalTokens}
            type="tokens"
            label={t('metricCards.primary.totalTokens')}
            insight={t('metricCards.primary.tokensPerRequestAvg', {
              value:
                metrics.knownRequests > 0
                  ? formatTokens(metrics.avgTokensPerRequest)
                  : t('common.notAvailable'),
            })}
          />
        }
        subtitle={
          ioRatio
            ? t('metricCards.primary.totalTokensSubtitleWithRatio', {
                ratio: ioRatio,
                tokensPerRequest:
                  metrics.knownRequests > 0
                    ? formatTokens(metrics.avgTokensPerRequest)
                    : t('common.notAvailable'),
              })
            : t('metricCards.primary.totalTokensSubtitle', {
                tokensPerRequest:
                  metrics.knownRequests > 0
                    ? formatTokens(metrics.avgTokensPerRequest)
                    : t('common.notAvailable'),
              })
        }
        icon={<Coins className="h-4 w-4" />}
        info={METRIC_HELP.totalTokens}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={2} order={2}>
      <MetricCard
        compact={group === 'details'}
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
    </DashboardMotionItem>,
    <DashboardMotionItem key={3} order={3}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.topModel')}
        value={metrics.topModel?.name ?? '–'}
        icon={<Cpu className="h-4 w-4" />}
        info={METRIC_HELP.topModel}
        {...(topModelSubtitle ? { subtitle: topModelSubtitle } : {})}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={4} order={4}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.cacheHitRate')}
        value={<FormattedValue value={metrics.cacheHitRate} type="percent" />}
        icon={<Database className="h-4 w-4" />}
        info={METRIC_HELP.cacheHitRate}
        {...(cacheHitRateSubtitle ? { subtitle: cacheHitRateSubtitle } : {})}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={5} order={5}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.costPerMillion')}
        value={<FormattedValue value={metrics.costPerMillion} type="currency" />}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.costPerMillion}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={6} order={6}>
      <MetricCard
        compact={group === 'details'}
        label={t('metricCards.primary.requests')}
        value={
          metrics.hasRequestData ? (
            <FormattedValue
              value={metrics.totalRequests}
              type="number"
              label={t('metricCards.primary.requests')}
              insight={t('insights.requestEconomy.summary', {
                cost:
                  metrics.knownRequests > 0
                    ? formatCurrency(metrics.avgCostPerRequest)
                    : t('common.notAvailable'),
                tokens:
                  metrics.knownRequests > 0
                    ? formatTokens(metrics.avgTokensPerRequest)
                    : t('common.notAvailable'),
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
                requests:
                  metrics.requestCoverage === 100
                    ? (viewMode === 'daily'
                        ? metrics.avgRequestsPerDay
                        : metrics.avgRequestsPerPeriod
                      ).toFixed(1)
                    : t('common.notAvailable'),
                unit: viewMode === 'daily' ? t('common.activeDay') : periodUnit(viewMode),
                cost:
                  metrics.knownRequests > 0
                    ? formatCurrency(metrics.avgCostPerRequest)
                    : t('common.notAvailable'),
                volatility: Math.round(metrics.requestVolatility),
              })
            : t('metricCards.primary.requestCountersMissing')
        }
        icon={<Activity className="h-4 w-4" />}
      />
    </DashboardMotionItem>,
    <DashboardMotionItem key={7} order={7}>
      <MetricCard
        compact={group === 'details'}
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
    </DashboardMotionItem>,
  ]
  const indices =
    group === 'primary'
      ? [0, 1, 6, 4]
      : group === 'details'
        ? [2, 3, 5, 7]
        : [0, 1, 6, 4, 2, 3, 5, 7]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {indices.map((index) => cards[index])}
    </div>
  )
}
