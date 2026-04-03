import { TrendingDown, DollarSign, Coins, Cpu, Database, Activity, BrainCircuit } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { SectionHeader } from '@/components/ui/section-header'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, formatPercent, formatDate, formatTokens } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage, DashboardMetrics } from '@/types'

interface TodayMetricsProps {
  today: DailyUsage
  metrics: DashboardMetrics
}

export function TodayMetrics({ today, metrics }: TodayMetricsProps) {
  const cacheHitRate = (today.cacheReadTokens + today.cacheCreationTokens) > 0
    ? (today.cacheReadTokens / (today.cacheReadTokens + today.cacheCreationTokens + today.inputTokens + today.outputTokens + today.thinkingTokens)) * 100
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
        info={SECTION_HELP.today}
      />
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <MetricCard
            label="Kosten heute"
            value={<FormattedValue value={today.totalCost} type="currency" />}
            subtitle={diffToAvg !== null ? `Ø ${formatCurrency(metrics.avgDailyCost)}/Tag` : undefined}
            icon={<DollarSign className="h-4 w-4" />}
            trend={diffToAvg !== null ? { value: diffToAvg, label: 'vs. Ø' } : null}
          />
          <MetricCard
            label="Tokens heute"
            value={<FormattedValue value={today.totalTokens} type="tokens" label="Tokens heute" insight={`${formatTokens(today.requestCount > 0 ? today.totalTokens / today.requestCount : 0)} pro Request`} />}
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
            label="$/1M Tokens"
            value={<FormattedValue value={today.totalTokens > 0 ? today.totalCost / (today.totalTokens / 1_000_000) : 0} type="currency" />}
            subtitle={metrics.costPerMillion > 0 ? `Gesamt-Ø: ${formatCurrency(metrics.costPerMillion)}` : undefined}
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <MetricCard
            label="Cache-Hit-Rate"
            value={<FormattedValue value={cacheHitRate} type="percent" />}
            subtitle={`${formatPercent((today.cacheReadTokens / (today.totalTokens || 1)) * 100)} Cache-Anteil`}
            icon={<Database className="h-4 w-4" />}
          />
          <MetricCard
            label="Requests"
            value={today.requestCount > 0 ? <FormattedValue value={today.requestCount} type="number" label="Requests heute" insight={`${formatCurrency(today.totalCost / today.requestCount)} pro Request`} /> : 'n/v'}
            subtitle={today.requestCount > 0 && today.modelsUsed?.length ? `${(today.requestCount / today.modelsUsed.length).toFixed(1)} / Modell · ${formatCurrency(today.totalCost / today.requestCount)}/Req` : 'Keine Request-Zähler'}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Thinking"
            value={<FormattedValue value={today.thinkingTokens} type="tokens" />}
            subtitle={today.totalTokens > 0 ? `${formatPercent((today.thinkingTokens / today.totalTokens) * 100)} Anteil` : undefined}
            icon={<BrainCircuit className="h-4 w-4" />}
          />
        </div>
      </FadeIn>
    </div>
  )
}
