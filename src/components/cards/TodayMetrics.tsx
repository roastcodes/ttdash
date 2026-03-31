import { CalendarClock, DollarSign, Coins, Cpu, Database, ArrowRightLeft } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { SectionHeader } from '@/components/ui/section-header'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage, DashboardMetrics } from '@/types'

interface TodayMetricsProps {
  today: DailyUsage
  metrics: DashboardMetrics
}

export function TodayMetrics({ today, metrics }: TodayMetricsProps) {
  const cacheHitRate = (today.cacheReadTokens + today.cacheCreationTokens) > 0
    ? (today.cacheReadTokens / (today.cacheReadTokens + today.cacheCreationTokens + today.inputTokens + today.outputTokens)) * 100
    : 0

  const topModel = today.modelBreakdowns?.length
    ? today.modelBreakdowns.reduce((a, b) => a.cost > b.cost ? a : b)
    : null

  const diffToAvg = metrics.avgDailyCost > 0
    ? ((today.totalCost - metrics.avgDailyCost) / metrics.avgDailyCost) * 100
    : null

  return (
    <div>
      <SectionHeader
        title={`Heute — ${formatDate(today.date, 'long')}`}
        description="KPIs des aktuellen Tages"
      />
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard
            label="Kosten heute"
            value={<FormattedValue value={today.totalCost} type="currency" />}
            subtitle={diffToAvg !== null ? `Ø ${formatCurrency(metrics.avgDailyCost)}/Tag` : undefined}
            icon={<DollarSign className="h-4 w-4" />}
            trend={diffToAvg !== null ? { value: diffToAvg, label: 'vs. Ø' } : null}
          />
          <MetricCard
            label="Tokens heute"
            value={<FormattedValue value={today.totalTokens} type="tokens" />}
            subtitle={today.inputTokens > 0 && today.outputTokens > 0
              ? `I/O Ratio: ${(today.inputTokens / today.outputTokens).toFixed(1)}:1`
              : undefined}
            icon={<Coins className="h-4 w-4" />}
          />
          <MetricCard
            label="Modelle"
            value={String(today.modelsUsed?.length ?? 0)}
            subtitle={topModel ? `Top: ${normalizeModelName(topModel.modelName)}` : undefined}
            icon={<Cpu className="h-4 w-4" />}
          />
          <MetricCard
            label="Top Modell Kosten"
            value={topModel ? formatCurrency(topModel.cost) : '–'}
            subtitle={topModel ? normalizeModelName(topModel.modelName) : undefined}
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <MetricCard
            label="Cache-Hit-Rate"
            value={<FormattedValue value={cacheHitRate} type="percent" />}
            subtitle={`${formatPercent((today.cacheReadTokens / (today.totalTokens || 1)) * 100)} Cache-Anteil`}
            icon={<Database className="h-4 w-4" />}
          />
          <MetricCard
            label="Input / Output"
            value={<FormattedValue value={today.inputTokens + today.outputTokens} type="tokens" />}
            subtitle={`In: ${((today.inputTokens / ((today.inputTokens + today.outputTokens) || 1)) * 100).toFixed(0)}% / Out: ${((today.outputTokens / ((today.inputTokens + today.outputTokens) || 1)) * 100).toFixed(0)}%`}
            icon={<ArrowRightLeft className="h-4 w-4" />}
          />
        </div>
      </FadeIn>
    </div>
  )
}
