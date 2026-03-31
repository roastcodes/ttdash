import { DollarSign, Coins, Calendar, Cpu, Database, TrendingDown } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatCurrency, formatPercent, periodUnit } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import type { DashboardMetrics, ViewMode } from '@/types'

interface PrimaryMetricsProps {
  metrics: DashboardMetrics
  totalCalendarDays?: number
  viewMode?: ViewMode
}

export function PrimaryMetrics({ metrics, totalCalendarDays, viewMode = 'daily' }: PrimaryMetricsProps) {
  // Calculate input/output ratio
  const ioRatio = metrics.totalInput > 0 && metrics.totalOutput > 0
    ? (metrics.totalInput / metrics.totalOutput).toFixed(1)
    : null

  // Estimate cache savings: cache reads that didn't need to be input tokens
  const cacheSavingsPercent = metrics.totalTokens > 0
    ? (metrics.totalCacheRead / metrics.totalTokens) * 100
    : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricCard
        label="Gesamtkosten"
        value={<FormattedValue value={metrics.totalCost} type="currency" />}
        subtitle={`Ø ${formatCurrency(metrics.avgDailyCost)}/${periodUnit(viewMode)}`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
        info={METRIC_HELP.totalCost}
      />
      <MetricCard
        label="Total Tokens"
        value={<FormattedValue value={metrics.totalTokens} type="tokens" />}
        subtitle={ioRatio ? `Input/Output Ratio: ${ioRatio}:1` : undefined}
        icon={<Coins className="h-4 w-4" />}
        info={METRIC_HELP.totalTokens}
      />
      <MetricCard
        label="Aktive Tage"
        value={String(metrics.activeDays)}
        subtitle={viewMode === 'daily' && totalCalendarDays ? `von ${totalCalendarDays} Kalendertagen` : undefined}
        icon={<Calendar className="h-4 w-4" />}
        info={METRIC_HELP.activeDays}
      />
      <MetricCard
        label="Top Modell"
        value={metrics.topModel?.name ?? '–'}
        subtitle={metrics.topModel ? formatCurrency(metrics.topModel.cost) : undefined}
        icon={<Cpu className="h-4 w-4" />}
        info={METRIC_HELP.topModel}
      />
      <MetricCard
        label="Cache-Hit-Rate"
        value={<FormattedValue value={metrics.cacheHitRate} type="percent" />}
        subtitle={cacheSavingsPercent > 0 ? `${formatPercent(cacheSavingsPercent)} Cache-Anteil` : undefined}
        icon={<Database className="h-4 w-4" />}
        info={METRIC_HELP.cacheHitRate}
      />
      <MetricCard
        label="$/1M Tokens"
        value={<FormattedValue value={metrics.costPerMillion} type="currency" />}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.costPerMillion}
      />
    </div>
  )
}
