import { TrendingUp, TrendingDown, BarChart3, ArrowUpDown } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { formatCurrency, formatTokens, formatDate } from '@/lib/formatters'
import type { DashboardMetrics } from '@/types'

interface SecondaryMetricsProps {
  metrics: DashboardMetrics
}

export function SecondaryMetrics({ metrics }: SecondaryMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Teuerster Tag"
        value={metrics.topDay ? formatCurrency(metrics.topDay.cost) : '–'}
        subtitle={metrics.topDay ? formatDate(metrics.topDay.date, 'long') : undefined}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard
        label="Günstigster Tag"
        value={metrics.cheapestDay ? formatCurrency(metrics.cheapestDay.cost) : '–'}
        subtitle={metrics.cheapestDay ? formatDate(metrics.cheapestDay.date, 'long') : undefined}
        icon={<TrendingDown className="h-4 w-4" />}
      />
      <MetricCard
        label="Ø Kosten/Tag"
        value={formatCurrency(metrics.avgDailyCost)}
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <MetricCard
        label="Output Tokens"
        value={formatTokens(metrics.totalOutput)}
        subtitle={`Input: ${formatTokens(metrics.totalInput)}`}
        icon={<ArrowUpDown className="h-4 w-4" />}
      />
    </div>
  )
}
