import { TrendingUp, TrendingDown, ChartBar, Sigma } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDate, formatCurrency, periodUnit } from '@/lib/formatters'
import { METRIC_HELP } from '@/lib/help-content'
import type { DashboardMetrics, ViewMode } from '@/types'

interface SecondaryMetricsProps {
  metrics: DashboardMetrics
  dailyCosts?: number[]
  viewMode?: ViewMode
}

export function SecondaryMetrics({ metrics, dailyCosts, viewMode = 'daily' }: SecondaryMetricsProps) {
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label={viewMode === 'yearly' ? 'Teuerstes Jahr' : viewMode === 'monthly' ? 'Teuerster Monat' : 'Teuerster Tag'}
        value={metrics.topDay ? <FormattedValue value={metrics.topDay.cost} type="currency" /> : '–'}
        subtitle={metrics.topDay ? formatDate(metrics.topDay.date, 'long') : undefined}
        icon={<TrendingUp className="h-4 w-4" />}
        info={METRIC_HELP.mostExpensiveDay}
      />
      <MetricCard
        label={viewMode === 'yearly' ? 'Günstigstes Jahr' : viewMode === 'monthly' ? 'Günstigster Monat' : 'Günstigster Tag'}
        value={metrics.cheapestDay ? <FormattedValue value={metrics.cheapestDay.cost} type="currency" /> : '–'}
        subtitle={metrics.cheapestDay ? formatDate(metrics.cheapestDay.date, 'long') : undefined}
        icon={<TrendingDown className="h-4 w-4" />}
        info={METRIC_HELP.cheapestDay}
      />
      <MetricCard
        label={`Ø Kosten/${periodUnit(viewMode)}`}
        value={<FormattedValue value={metrics.avgDailyCost} type="currency" />}
        subtitle={costSpread !== null ? `Spanne: ${formatCurrency(costSpread)}` : undefined}
        icon={<ChartBar className="h-4 w-4" />}
        info={METRIC_HELP.avgCostPerDay}
      />
      <MetricCard
        label={`Median/${periodUnit(viewMode)}`}
        value={median !== null ? <FormattedValue value={median} type="currency" /> : '–'}
        subtitle={median !== null && metrics.avgDailyCost > 0
          ? `${median < metrics.avgDailyCost ? '↓' : '↑'}${Math.abs(((median - metrics.avgDailyCost) / metrics.avgDailyCost) * 100).toFixed(0)}% vs. Ø`
          : undefined}
        icon={<Sigma className="h-4 w-4" />}
        info="Der Median zeigt den typischen Tageswert – weniger anfällig für Ausreisser als der Durchschnitt."
      />
    </div>
  )
}
