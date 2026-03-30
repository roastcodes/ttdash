import { DollarSign, Coins, Calendar, Cpu, Database, TrendingDown } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { formatCurrency, formatTokens, formatPercent } from '@/lib/formatters'
import type { DashboardMetrics } from '@/types'

interface PrimaryMetricsProps {
  metrics: DashboardMetrics
}

export function PrimaryMetrics({ metrics }: PrimaryMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricCard
        label="Gesamtkosten"
        value={formatCurrency(metrics.totalCost)}
        subtitle={`Ø ${formatCurrency(metrics.avgDailyCost)}/Tag`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={metrics.weekOverWeekChange !== null ? { value: metrics.weekOverWeekChange } : null}
      />
      <MetricCard
        label="Total Tokens"
        value={formatTokens(metrics.totalTokens)}
        icon={<Coins className="h-4 w-4" />}
      />
      <MetricCard
        label="Aktive Tage"
        value={String(metrics.activeDays)}
        icon={<Calendar className="h-4 w-4" />}
      />
      <MetricCard
        label="Top Modell"
        value={metrics.topModel?.name ?? '–'}
        subtitle={metrics.topModel ? formatCurrency(metrics.topModel.cost) : undefined}
        icon={<Cpu className="h-4 w-4" />}
      />
      <MetricCard
        label="Cache-Hit-Rate"
        value={formatPercent(metrics.cacheHitRate)}
        icon={<Database className="h-4 w-4" />}
      />
      <MetricCard
        label="$/1M Tokens"
        value={`$${metrics.costPerMillion.toFixed(2)}`}
        icon={<TrendingDown className="h-4 w-4" />}
      />
    </div>
  )
}
