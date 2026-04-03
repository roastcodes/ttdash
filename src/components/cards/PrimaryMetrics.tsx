import { DollarSign, Coins, Calendar, Cpu, Database, TrendingDown, Activity, BrainCircuit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatCurrency, formatPercent, formatTokens, periodUnit } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import type { DashboardMetrics, ViewMode } from '@/types'

interface PrimaryMetricsProps {
  metrics: DashboardMetrics
  totalCalendarDays?: number
  viewMode?: ViewMode
}

export function PrimaryMetrics({ metrics, totalCalendarDays, viewMode = 'daily' }: PrimaryMetricsProps) {
  const { t } = useTranslation()
  // Calculate input/output ratio
  const ioRatio = metrics.totalInput > 0 && metrics.totalOutput > 0
    ? (metrics.totalInput / metrics.totalOutput).toFixed(1)
    : null

  const coverageRate = totalCalendarDays && viewMode === 'daily'
    ? (metrics.activeDays / totalCalendarDays) * 100
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      <MetricCard
        label={t('metricCards.primary.totalCost')}
        value={<FormattedValue value={metrics.totalCost} type="currency" label={t('metricCards.primary.totalCost')} insight={t('metricCards.primary.avgPerPeriod', { value: formatCurrency(metrics.avgDailyCost), unit: periodUnit(viewMode) })} />}
        subtitle={`Ø ${formatCurrency(metrics.avgDailyCost)}/${periodUnit(viewMode)} · ${formatCurrency(metrics.avgCostPerRequest)}/Req`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
        info={METRIC_HELP.totalCost}
      />
      <MetricCard
        label={t('metricCards.primary.totalTokens')}
        value={<FormattedValue value={metrics.totalTokens} type="tokens" label={t('metricCards.primary.totalTokens')} insight={t('metricCards.primary.tokensPerRequestAvg', { value: formatTokens(metrics.avgTokensPerRequest) })} />}
        subtitle={ioRatio ? `I/O ${ioRatio}:1 · ${formatTokens(metrics.avgTokensPerRequest)} / Request` : `${formatTokens(metrics.avgTokensPerRequest)} / Request`}
        icon={<Coins className="h-4 w-4" />}
        info={METRIC_HELP.totalTokens}
      />
      <MetricCard
        label={t('metricCards.primary.activeDays')}
        value={String(metrics.activeDays)}
        subtitle={coverageRate !== null
          ? t('metricCards.primary.coverageOfDays', { coverage: formatPercent(coverageRate, 0), days: totalCalendarDays })
          : t('metricCards.primary.providersActive', { count: metrics.providerCount })}
        icon={<Calendar className="h-4 w-4" />}
        info={METRIC_HELP.activeDays}
      />
      <MetricCard
        label={t('metricCards.primary.topModel')}
        value={metrics.topModel?.name ?? '–'}
        subtitle={metrics.topModel
          ? `${formatCurrency(metrics.topModel.cost)} · ${t('metricCards.primary.share', { value: formatPercent(metrics.topModelShare, 0) })}${metrics.topRequestModel ? ` · ${t('metricCards.primary.requestLead', { value: metrics.topRequestModel.name })}` : ''}`
          : undefined}
        icon={<Cpu className="h-4 w-4" />}
        info={METRIC_HELP.topModel}
      />
      <MetricCard
        label={t('metricCards.primary.cacheHitRate')}
        value={<FormattedValue value={metrics.cacheHitRate} type="percent" />}
        subtitle={metrics.totalTokens > 0 ? t('metricCards.primary.allTokensViaCacheRead', { value: formatPercent((metrics.totalCacheRead / metrics.totalTokens) * 100) }) : undefined}
        icon={<Database className="h-4 w-4" />}
        info={METRIC_HELP.cacheHitRate}
      />
      <MetricCard
        label={t('metricCards.primary.costPerMillion')}
        value={<FormattedValue value={metrics.costPerMillion} type="currency" />}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.costPerMillion}
      />
      <MetricCard
        label={t('metricCards.primary.requests')}
        value={metrics.hasRequestData ? <FormattedValue value={metrics.totalRequests} type="number" label={t('metricCards.primary.requests')} insight={t('insights.requestEconomy.summary', { cost: formatCurrency(metrics.avgCostPerRequest), tokens: formatTokens(metrics.avgTokensPerRequest), leader: '' }).trim()} /> : t('common.notAvailable')}
        subtitle={metrics.hasRequestData
          ? t('metricCards.primary.requestsSubtitle', { requests: metrics.avgRequestsPerDay.toFixed(1), unit: periodUnit(viewMode), cost: formatCurrency(metrics.avgCostPerRequest), volatility: Math.round(metrics.requestVolatility) })
          : t('metricCards.primary.requestCountersMissing')}
        icon={<Activity className="h-4 w-4" />}
      />
      <MetricCard
        label={t('metricCards.primary.thinking')}
        value={<FormattedValue value={metrics.totalThinking} type="tokens" label={t('metricCards.primary.thinking')} insight={metrics.totalTokens > 0 ? t('metricCards.primary.thinkingShareOfVolume', { value: formatPercent((metrics.totalThinking / metrics.totalTokens) * 100) }) : undefined} />}
        subtitle={metrics.totalTokens > 0
          ? t('metricCards.primary.thinkingSubtitle', { share: formatPercent((metrics.totalThinking / metrics.totalTokens) * 100), tokens: formatTokens(metrics.totalThinking / Math.max(metrics.totalRequests, 1)) })
          : undefined}
        icon={<BrainCircuit className="h-4 w-4" />}
      />
    </div>
  )
}
