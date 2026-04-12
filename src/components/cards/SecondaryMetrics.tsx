import { TrendingUp, ChartBar, Sigma, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDate, formatCurrency, formatNumber, formatPercent, periodUnit } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import type { DashboardMetrics, ViewMode } from '@/types'

interface SecondaryMetricsProps {
  metrics: DashboardMetrics
  dailyCosts?: number[]
  viewMode?: ViewMode
}

export function SecondaryMetrics({ metrics, dailyCosts, viewMode = 'daily' }: SecondaryMetricsProps) {
  const { t } = useTranslation()
  // Calculate spread between most and least expensive days
  const costSpread = metrics.topDay && metrics.cheapestDay
    ? metrics.topDay.cost - metrics.cheapestDay.cost
    : null

  // Calculate median
  const median = (() => {
    if (!dailyCosts || dailyCosts.length === 0) return null
    const sorted = [...dailyCosts].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  })()
  const requestLeader = metrics.topRequestModel
    ? t('metricCards.secondary.requestLeader', { model: metrics.topRequestModel.name, requests: formatNumber(metrics.topRequestModel.requests) })
    : null
  const topDaySubtitle = metrics.topDay ? formatDate(metrics.topDay.date, 'long') : null
  const topProviderSubtitle = metrics.topProvider
    ? t('metricCards.secondary.dominantProviderSubtitle', {
        share: formatPercent(metrics.topProvider.share, 0),
        cost: formatCurrency(metrics.topProvider.cost),
        requestLeader: requestLeader ? ` · ${requestLeader}` : '',
      })
    : null
  const peakSubtitle = viewMode === 'daily' && metrics.busiestWeek
    ? `${formatDate(metrics.busiestWeek.start)} – ${formatDate(metrics.busiestWeek.end)}`
    : costSpread !== null
      ? t('metricCards.secondary.spread', { value: formatCurrency(costSpread) })
      : null
  const medianSubtitle = median !== null && metrics.avgDailyCost > 0
    ? `${t('metricCards.secondary.vsAverage', { direction: median < metrics.avgDailyCost ? '↓' : '↑', value: Math.abs(((median - metrics.avgDailyCost) / metrics.avgDailyCost) * 100).toFixed(0) })} · σ Req ${Math.round(metrics.requestVolatility)}`
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label={viewMode === 'yearly' ? t('metricCards.secondary.mostExpensiveYear') : viewMode === 'monthly' ? t('metricCards.secondary.mostExpensiveMonth') : t('metricCards.secondary.mostExpensiveDay')}
        value={metrics.topDay ? <FormattedValue value={metrics.topDay.cost} type="currency" /> : '–'}
        icon={<TrendingUp className="h-4 w-4" />}
        info={METRIC_HELP.mostExpensiveDay}
        {...(topDaySubtitle ? { subtitle: topDaySubtitle } : {})}
      />
      <MetricCard
        label={t('metricCards.secondary.dominantProvider')}
        value={metrics.topProvider?.name ?? '–'}
        icon={<Building2 className="h-4 w-4" />}
        info={t('metricCards.secondary.medianInfo')}
        {...(topProviderSubtitle ? { subtitle: topProviderSubtitle } : {})}
      />
      <MetricCard
        label={viewMode === 'daily' ? t('metricCards.secondary.peak7Days') : t('metricCards.secondary.avgCostPerUnit', { unit: periodUnit(viewMode) })}
        value={viewMode === 'daily' && metrics.busiestWeek ? <FormattedValue value={metrics.busiestWeek.cost} type="currency" /> : <FormattedValue value={metrics.avgDailyCost} type="currency" />}
        icon={<ChartBar className="h-4 w-4" />}
        info={METRIC_HELP.avgCostPerDay}
        {...(peakSubtitle ? { subtitle: peakSubtitle } : {})}
      />
      <MetricCard
        label={t('metricCards.secondary.medianPerUnit', { unit: periodUnit(viewMode) })}
        value={median !== null ? <FormattedValue value={median} type="currency" /> : '–'}
        icon={<Sigma className="h-4 w-4" />}
        info={t('metricCards.secondary.medianInfo')}
        {...(medianSubtitle ? { subtitle: medianSubtitle } : {})}
      />
    </div>
  )
}
