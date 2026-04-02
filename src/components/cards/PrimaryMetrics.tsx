import { DollarSign, Coins, Calendar, Cpu, Database, TrendingDown, Activity, BrainCircuit } from 'lucide-react'
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
        label="Gesamtkosten"
        value={<FormattedValue value={metrics.totalCost} type="currency" label="Gesamtkosten" insight={`${formatCurrency(metrics.avgDailyCost)}/${periodUnit(viewMode)} im Mittel`} />}
        subtitle={`Ø ${formatCurrency(metrics.avgDailyCost)}/${periodUnit(viewMode)} · ${formatCurrency(metrics.avgCostPerRequest)}/Req`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
        info={METRIC_HELP.totalCost}
      />
      <MetricCard
        label="Total Tokens"
        value={<FormattedValue value={metrics.totalTokens} type="tokens" label="Total Tokens" insight={`${formatTokens(metrics.avgTokensPerRequest)} pro Request im Mittel`} />}
        subtitle={ioRatio ? `I/O ${ioRatio}:1 · ${formatTokens(metrics.avgTokensPerRequest)}/Req` : `${formatTokens(metrics.avgTokensPerRequest)}/Req`}
        icon={<Coins className="h-4 w-4" />}
        info={METRIC_HELP.totalTokens}
      />
      <MetricCard
        label="Aktive Tage"
        value={String(metrics.activeDays)}
        subtitle={coverageRate !== null ? `${formatPercent(coverageRate, 0)} Abdeckung von ${totalCalendarDays} Tagen` : `${metrics.providerCount} Anbieter aktiv`}
        icon={<Calendar className="h-4 w-4" />}
        info={METRIC_HELP.activeDays}
      />
      <MetricCard
        label="Top Modell"
        value={metrics.topModel?.name ?? '–'}
        subtitle={metrics.topModel ? `${formatCurrency(metrics.topModel.cost)} · ${formatPercent(metrics.topModelShare, 0)} Anteil` : undefined}
        icon={<Cpu className="h-4 w-4" />}
        info={METRIC_HELP.topModel}
      />
      <MetricCard
        label="Cache-Hit-Rate"
        value={<FormattedValue value={metrics.cacheHitRate} type="percent" />}
        subtitle={metrics.totalTokens > 0 ? `${formatPercent((metrics.totalCacheRead / metrics.totalTokens) * 100)} aller Tokens via Cache Read` : undefined}
        icon={<Database className="h-4 w-4" />}
        info={METRIC_HELP.cacheHitRate}
      />
      <MetricCard
        label="$/1M Tokens"
        value={<FormattedValue value={metrics.costPerMillion} type="currency" />}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.costPerMillion}
      />
      <MetricCard
        label="Requests"
        value={metrics.hasRequestData ? <FormattedValue value={metrics.totalRequests} type="number" label="Requests" insight={`${formatCurrency(metrics.avgCostPerRequest)} pro Request im Mittel`} /> : 'n/v'}
        subtitle={metrics.hasRequestData ? `Ø ${metrics.avgRequestsPerDay.toFixed(1)}/${periodUnit(viewMode)} · ${formatCurrency(metrics.avgCostPerRequest)}/Req` : 'Keine Request-Zähler im Datensatz'}
        icon={<Activity className="h-4 w-4" />}
      />
      <MetricCard
        label="Thinking"
        value={<FormattedValue value={metrics.totalThinking} type="tokens" label="Thinking Tokens" insight={metrics.totalTokens > 0 ? `${formatPercent((metrics.totalThinking / metrics.totalTokens) * 100)} des gesamten Tokenvolumens` : undefined} />}
        subtitle={metrics.totalTokens > 0 ? `${formatPercent((metrics.totalThinking / metrics.totalTokens) * 100)} Anteil · ${formatTokens(metrics.totalThinking / Math.max(metrics.totalRequests, 1))}/Req` : undefined}
        icon={<BrainCircuit className="h-4 w-4" />}
      />
    </div>
  )
}
