import { TrendingUp, TrendingDown, ChartBar, ArrowUpDown } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDate, formatTokens } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import type { DashboardMetrics } from '@/types'

interface SecondaryMetricsProps {
  metrics: DashboardMetrics
}

export function SecondaryMetrics({ metrics }: SecondaryMetricsProps) {
  // Calculate spread between most and least expensive days
  const costSpread = metrics.topDay && metrics.cheapestDay
    ? metrics.topDay.cost - metrics.cheapestDay.cost
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Teuerster Tag"
        value={metrics.topDay ? <FormattedValue value={metrics.topDay.cost} type="currency" /> : '–'}
        subtitle={metrics.topDay ? formatDate(metrics.topDay.date, 'long') : undefined}
        icon={<TrendingUp className="h-4 w-4" />}
        info={METRIC_HELP.mostExpensiveDay}
      />
      <MetricCard
        label="Günstigster Tag"
        value={metrics.cheapestDay ? <FormattedValue value={metrics.cheapestDay.cost} type="currency" /> : '–'}
        subtitle={metrics.cheapestDay ? formatDate(metrics.cheapestDay.date, 'long') : undefined}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.cheapestDay}
      />
      <MetricCard
        label="Ø Kosten/Tag"
        value={<FormattedValue value={metrics.avgDailyCost} type="currency" />}
        subtitle={costSpread !== null ? `Spanne: $${costSpread.toFixed(2)}` : undefined}
        icon={<ChartBar className="h-4 w-4" />}
        info={METRIC_HELP.avgCostPerDay}
      />
      <MetricCard
        label="Output Tokens"
        value={<FormattedValue value={metrics.totalOutput} type="tokens" />}
        subtitle={`Input: ${formatTokens(metrics.totalInput)}`}
        icon={<ArrowUpDown className="h-4 w-4" />}
        info={METRIC_HELP.outputTokens}
      />
    </div>
  )
}
