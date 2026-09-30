import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingDown,
  DollarSign,
  Coins,
  Cpu,
  Database,
  CalendarDays,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { MetricCard } from './MetricCard'
import { DashboardMotionItem } from '@/components/dashboard/DashboardMotion'
import { FormattedValue } from '@/components/ui/formatted-value'
import { SectionHeader } from '@/components/ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, formatMonthYear } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import { useLocalDay } from '@/hooks/use-local-day'
import { computeMetrics } from '@/lib/calculations'
import { buildPeriodComparison } from '@/lib/period-comparison-data'
import { normalizeModelName } from '@/lib/model-utils'
import type { DailyUsage, DashboardMetrics } from '@/types'

interface MonthMetricsProps {
  daily: DailyUsage[]
  metrics: DashboardMetrics
}

/** Renders KPI cards for the current month slice. */
export function MonthMetrics({ daily, metrics }: MonthMetricsProps) {
  const { t } = useTranslation()
  const locale = getCurrentLocale()
  const todayStr = useLocalDay()
  const currentMonth = todayStr.slice(0, 7)
  const oneDecimalFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const oneDecimalPercentFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const wholePercentFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const monthData = useMemo(
    () => daily.filter((d) => d.date.startsWith(currentMonth) && d.date <= todayStr),
    [daily, currentMonth, todayStr],
  )

  const comparison = useMemo(
    () => buildPeriodComparison(daily, 'month', todayStr),
    [daily, todayStr],
  )
  const agg = useMemo(() => {
    if (monthData.length === 0) return null
    const monthMetrics = computeMetrics(monthData)

    const totalCost = monthData.reduce((s, d) => s + d.totalCost, 0)
    const totalTokens = monthData.reduce((s, d) => s + d.totalTokens, 0)
    const inputTokens = monthData.reduce((s, d) => s + d.inputTokens, 0)
    const outputTokens = monthData.reduce((s, d) => s + d.outputTokens, 0)
    const cacheRead = monthData.reduce((s, d) => s + d.cacheReadTokens, 0)
    const cacheCreate = monthData.reduce((s, d) => s + d.cacheCreationTokens, 0)
    const thinkingTokens = monthData.reduce((s, d) => s + d.thinkingTokens, 0)
    const requestCount = monthData.reduce((s, d) => s + d.requestCount, 0)

    const allTokens = cacheRead + cacheCreate + inputTokens + outputTokens + thinkingTokens
    const cacheHitRate = allTokens > 0 ? (cacheRead / allTokens) * 100 : 0
    const costPerMillion = totalTokens > 0 ? totalCost / (totalTokens / 1_000_000) : 0

    const models = new Set<string>()
    const modelCosts = new Map<string, number>()
    for (const d of monthData) {
      for (const mb of d.modelBreakdowns) {
        const name = normalizeModelName(mb.modelName)
        models.add(name)
        modelCosts.set(name, (modelCosts.get(name) ?? 0) + mb.cost)
      }
    }
    let topModel: { name: string; cost: number } | null = null
    for (const [name, cost] of modelCosts) {
      if (!topModel || cost > topModel.cost) topModel = { name, cost }
    }

    // Days elapsed in the current local month so far.
    const dayOfMonth = Number(todayStr.slice(8, 10))

    return {
      totalCost,
      totalTokens,
      inputTokens,
      outputTokens,
      cacheRead,
      cacheCreate,
      thinkingTokens,
      requestCount,
      cacheHitRate,
      costPerMillion,
      activeDays: monthMetrics.activeDays,
      avgCostPerRequest: monthMetrics.avgCostPerRequest,
      avgRequestsPerDay: monthMetrics.avgRequestsPerDay,
      hasRequestData: monthMetrics.hasRequestData,
      knownRequests: monthMetrics.knownRequests,
      requestCoverage: monthMetrics.requestCoverage,
      dayOfMonth,
      modelCount: models.size,
      topModel,
    }
  }, [monthData, todayStr])

  const prevMonthCost = comparison.periodB.reduce((sum, day) => sum + day.totalCost, 0)
  const comparableCost = comparison.periodA.reduce((sum, day) => sum + day.totalCost, 0)

  if (!agg) return null

  const diffToPrev =
    prevMonthCost > 0 ? ((comparableCost - prevMonthCost) / prevMonthCost) * 100 : null

  const ioTotal = agg.inputTokens + agg.outputTokens
  const tokensSubtitle =
    agg.inputTokens > 0 && agg.outputTokens > 0
      ? t('metricCards.month.ioRatio', {
          value: oneDecimalFormatter.format(agg.inputTokens / agg.outputTokens),
        })
      : null
  const modelsSubtitle = agg.topModel
    ? t('metricCards.month.topModel', { value: agg.topModel.name })
    : null
  const costPerMillionSubtitle =
    metrics.costPerMillion > 0
      ? t('metricCards.today.overallAverage', { value: formatCurrency(metrics.costPerMillion) })
      : null
  const thinkingSubtitle =
    agg.totalTokens > 0
      ? t('metricCards.month.thinkingSubtitle', {
          value: oneDecimalPercentFormatter.format(agg.thinkingTokens / agg.totalTokens),
        })
      : null

  return (
    <div>
      <SectionHeader
        title={t('metricCards.month.title', { date: formatMonthYear(currentMonth) })}
        badge={t('metricCards.month.badge', { count: agg.activeDays })}
        description={t('metricCards.month.description')}
        info={SECTION_HELP.currentMonth}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <DashboardMotionItem order={0}>
          <MetricCard
            label={t('metricCards.month.costMonth')}
            value={<FormattedValue value={agg.totalCost} type="currency" />}
            subtitle={t('metricCards.month.avgPerDay', {
              value: formatCurrency(agg.totalCost / Math.max(1, agg.activeDays)),
            })}
            icon={<DollarSign className="h-4 w-4" />}
            trend={
              diffToPrev !== null
                ? { value: diffToPrev, label: t('metricCards.month.vsPreviousMonth') }
                : null
            }
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={1}>
          <MetricCard
            label={t('metricCards.month.tokensMonth')}
            value={<FormattedValue value={agg.totalTokens} type="tokens" />}
            icon={<Coins className="h-4 w-4" />}
            {...(tokensSubtitle ? { subtitle: tokensSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={2}>
          <MetricCard
            label={t('metricCards.month.activeDays')}
            value={`${agg.activeDays} / ${agg.dayOfMonth}`}
            subtitle={t('metricCards.month.coverage', {
              value: wholePercentFormatter.format(agg.activeDays / agg.dayOfMonth),
            })}
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={3}>
          <MetricCard
            label={t('metricCards.month.models')}
            value={String(agg.modelCount)}
            icon={<Cpu className="h-4 w-4" />}
            {...(modelsSubtitle ? { subtitle: modelsSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={4}>
          <MetricCard
            label={t('metricCards.month.costPerMillion')}
            value={<FormattedValue value={agg.costPerMillion} type="currency" />}
            icon={<TrendingDown className="h-4 w-4" />}
            {...(costPerMillionSubtitle ? { subtitle: costPerMillionSubtitle } : {})}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={5}>
          <MetricCard
            label={t('metricCards.month.cacheHitRate')}
            value={<FormattedValue value={agg.cacheHitRate} type="percent" />}
            subtitle={t('metricCards.month.cacheMix', {
              input: wholePercentFormatter.format(ioTotal > 0 ? agg.inputTokens / ioTotal : 0),
              output: wholePercentFormatter.format(ioTotal > 0 ? agg.outputTokens / ioTotal : 0),
            })}
            icon={<Database className="h-4 w-4" />}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={6}>
          <MetricCard
            label={t('metricCards.month.requests')}
            value={
              agg.hasRequestData ? (
                <FormattedValue
                  value={agg.requestCount}
                  type="number"
                  label={t('metricCards.month.requestsInMonth')}
                  insight={t('metricCards.month.costPerRequest', {
                    value:
                      agg.knownRequests > 0
                        ? formatCurrency(agg.avgCostPerRequest)
                        : t('common.notAvailable'),
                  })}
                />
              ) : (
                t('common.notAvailable')
              )
            }
            subtitle={
              agg.hasRequestData
                ? t('metricCards.month.requestsSubtitle', {
                    value:
                      agg.requestCoverage === 100
                        ? agg.avgRequestsPerDay.toFixed(1)
                        : t('common.notAvailable'),
                    cost:
                      agg.knownRequests > 0
                        ? formatCurrency(agg.avgCostPerRequest)
                        : t('common.notAvailable'),
                  })
                : t('metricCards.month.requestCountersMissing')
            }
            icon={<Activity className="h-4 w-4" />}
          />
        </DashboardMotionItem>
        <DashboardMotionItem order={7}>
          <MetricCard
            label={t('metricCards.month.thinking')}
            value={<FormattedValue value={agg.thinkingTokens} type="tokens" />}
            icon={<BrainCircuit className="h-4 w-4" />}
            {...(thinkingSubtitle ? { subtitle: thinkingSubtitle } : {})}
          />
        </DashboardMotionItem>
      </div>
    </div>
  )
}
