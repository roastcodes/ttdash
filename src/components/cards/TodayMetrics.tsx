import { computeMetrics } from '@/lib/calculations'
import {
  TrendingDown,
  DollarSign,
  Coins,
  Cpu,
  Database,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardMotionItem } from '@/components/dashboard/DashboardMotion'
import { MetricCard } from './MetricCard'
import { FormattedValue } from '@/components/ui/formatted-value'
import { SectionHeader } from '@/components/ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, formatPercent, formatDate, formatTokens } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage, DashboardMetrics } from '@/types'

interface TodayMetricsProps {
  today: DailyUsage
  metrics: DashboardMetrics
}

/** Renders KPI cards for the latest day in the dataset. */
export function TodayMetrics({ today, metrics }: TodayMetricsProps) {
  const { t } = useTranslation()
  const todayMetrics = computeMetrics([{ ...today, modelsUsed: today.modelsUsed ?? [] }])
  const modelsCount = today.modelsUsed?.length ?? 0
  const cacheHitRate =
    today.cacheReadTokens + today.cacheCreationTokens > 0
      ? (today.cacheReadTokens /
          (today.cacheReadTokens +
            today.cacheCreationTokens +
            today.inputTokens +
            today.outputTokens +
            today.thinkingTokens)) *
        100
      : 0

  const topModel = today.modelBreakdowns?.length
    ? today.modelBreakdowns.reduce((a, b) => (a.cost > b.cost ? a : b))
    : null

  const diffToAvg =
    metrics.avgDailyCost > 0
      ? ((today.totalCost - metrics.avgDailyCost) / metrics.avgDailyCost) * 100
      : null
  const costSubtitle =
    diffToAvg !== null
      ? t('metricCards.today.avgPerDay', { value: formatCurrency(metrics.avgDailyCost) })
      : null
  const tokensSubtitle =
    today.inputTokens > 0 && today.outputTokens > 0
      ? t('metricCards.today.ioRatio', {
          value: (today.inputTokens / today.outputTokens).toFixed(1),
        })
      : null
  const modelSubtitle = topModel
    ? t('metricCards.today.topModel', { value: normalizeModelName(topModel.modelName) })
    : null
  const costPerMillionSubtitle =
    metrics.costPerMillion > 0
      ? t('metricCards.today.overallAverage', { value: formatCurrency(metrics.costPerMillion) })
      : null
  const requestsSubtitle =
    todayMetrics.hasRequestData && modelsCount > 0
      ? t('metricCards.today.requestsSubtitle', {
          value:
            todayMetrics.requestCoverage === 100
              ? (today.requestCount / modelsCount).toFixed(1)
              : t('common.notAvailable'),
          cost:
            todayMetrics.knownRequests > 0
              ? formatCurrency(todayMetrics.avgCostPerRequest)
              : t('common.notAvailable'),
        })
      : t('metricCards.today.requestCountersMissing')
  const thinkingSubtitle =
    today.totalTokens > 0
      ? t('metricCards.today.thinkingSubtitle', {
          value: formatPercent((today.thinkingTokens / today.totalTokens) * 100),
        })
      : null

  return (
    <div>
      <SectionHeader
        title={t('metricCards.today.title', { date: formatDate(today.date, 'long') })}
        description={t('metricCards.today.description')}
        info={SECTION_HELP.today}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <DashboardMotionItem order={0}>
          <MetricCard
            label={t('metricCards.today.costToday')}
            value={<FormattedValue value={today.totalCost} type="currency" />}
            icon={<DollarSign className="h-4 w-4" />}
            trend={
              diffToAvg !== null
                ? { value: diffToAvg, label: t('metricCards.today.vsAverageShort') }
                : null
            }
            {...(costSubtitle ? { subtitle: costSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={1}>
          <MetricCard
            label={t('metricCards.today.tokensToday')}
            value={
              <FormattedValue
                value={today.totalTokens}
                type="tokens"
                label={t('metricCards.today.tokensToday')}
                insight={t('metricCards.today.tokensInsight', {
                  value:
                    todayMetrics.knownRequests > 0
                      ? formatTokens(todayMetrics.avgTokensPerRequest)
                      : t('common.notAvailable'),
                })}
              />
            }
            icon={<Coins className="h-4 w-4" />}
            {...(tokensSubtitle ? { subtitle: tokensSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={2}>
          <MetricCard
            label={t('metricCards.today.models')}
            value={String(modelsCount)}
            icon={<Cpu className="h-4 w-4" />}
            {...(modelSubtitle ? { subtitle: modelSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={3}>
          <MetricCard
            label={t('metricCards.today.costPerMillion')}
            value={
              <FormattedValue
                value={
                  today.totalTokens > 0 ? today.totalCost / (today.totalTokens / 1_000_000) : 0
                }
                type="currency"
              />
            }
            icon={<TrendingDown className="h-4 w-4" />}
            {...(costPerMillionSubtitle ? { subtitle: costPerMillionSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={4}>
          <MetricCard
            label={t('metricCards.today.cacheHitRate')}
            value={<FormattedValue value={cacheHitRate} type="percent" />}
            subtitle={t('metricCards.today.cacheShare', {
              value: formatPercent((today.cacheReadTokens / (today.totalTokens || 1)) * 100),
            })}
            icon={<Database className="h-4 w-4" />}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={5}>
          <MetricCard
            label={t('metricCards.today.requests')}
            value={
              todayMetrics.hasRequestData ? (
                <FormattedValue
                  value={today.requestCount}
                  type="number"
                  label={t('metricCards.today.requestsToday')}
                  insight={t('metricCards.today.requestsInsight', {
                    value:
                      todayMetrics.knownRequests > 0
                        ? formatCurrency(todayMetrics.avgCostPerRequest)
                        : t('common.notAvailable'),
                  })}
                />
              ) : (
                t('common.notAvailable')
              )
            }
            subtitle={requestsSubtitle}
            icon={<Activity className="h-4 w-4" />}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={6}>
          <MetricCard
            label={t('metricCards.today.thinking')}
            value={<FormattedValue value={today.thinkingTokens} type="tokens" />}
            icon={<BrainCircuit className="h-4 w-4" />}
            {...(thinkingSubtitle ? { subtitle: thinkingSubtitle } : {})}
          />
        </DashboardMotionItem>
      </div>
    </div>
  )
}
