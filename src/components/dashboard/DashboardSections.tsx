import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { PrimaryMetrics } from '../cards/PrimaryMetrics'
import { SecondaryMetrics } from '../cards/SecondaryMetrics'
import { TodayMetrics } from '../cards/TodayMetrics'
import { MonthMetrics } from '../cards/MonthMetrics'
import { CostOverTime } from '../charts/CostOverTime'
import { CostByModel } from '../charts/CostByModel'
import { CostByModelOverTime } from '../charts/CostByModelOverTime'
import { CumulativeCost } from '../charts/CumulativeCost'
import { TokensOverTime } from '../charts/TokensOverTime'
import { RequestsOverTime } from '../charts/RequestsOverTime'
import { RequestCacheHitRateByModel } from '../charts/RequestCacheHitRateByModel'
import { TokenTypes } from '../charts/TokenTypes'
import { CostByWeekday } from '../charts/CostByWeekday'
import { TokenEfficiency } from '../charts/TokenEfficiency'
import { ModelMix } from '../charts/ModelMix'
import { DistributionAnalysis } from '../charts/DistributionAnalysis'
import { CorrelationAnalysis } from '../charts/CorrelationAnalysis'
import { ModelEfficiency } from '../tables/ModelEfficiency'
import { ProviderEfficiency } from '../tables/ProviderEfficiency'
import { RecentDays } from '../tables/RecentDays'
import { HeatmapCalendar } from '../features/heatmap/HeatmapCalendar'
import { CostForecast } from '../features/forecast/CostForecast'
import { CacheROI } from '../features/cache-roi/CacheROI'
import { PeriodComparison } from '../features/comparison/PeriodComparison'
import { AnomalyDetection } from '../features/anomaly/AnomalyDetection'
import { UsageInsights } from '../features/insights/UsageInsights'
import { ConcentrationRisk } from '../features/risk/ConcentrationRisk'
import { RequestQuality } from '../features/request-quality/RequestQuality'
import { FadeIn } from '../features/animations/FadeIn'
import { ProviderLimitsSection } from '../features/limits/ProviderLimitsSection'
import { SectionHeader } from '../ui/section-header'
import { ExpandableCard } from '../ui/expandable-card'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, formatPercent, formatTokens, periodUnit } from '@/lib/formatters'
import type {
  AggregateMetrics,
  ChartDataPoint,
  DailyUsage,
  DashboardMetrics,
  DashboardSectionId,
  ProviderLimits,
  RequestChartDataPoint,
  TokenChartDataPoint,
  ViewMode,
  WeekdayData,
} from '@/types'

interface DashboardSectionsProps {
  sectionOrder: DashboardSectionId[]
  sectionVisibility: Record<DashboardSectionId, boolean>
  metrics: DashboardMetrics
  viewMode: ViewMode
  totalCalendarDays: number
  filteredData: DailyUsage[]
  filteredDailyData: DailyUsage[]
  todayData: DailyUsage | null
  hasCurrentMonthData: boolean
  visibleLimitProviders: string[]
  providerLimits: ProviderLimits
  selectedMonth: string | null
  allModels: string[]
  costChartData: ChartDataPoint[]
  modelPieData: Array<{ name: string; value: number }>
  modelCostChartData: Array<ChartDataPoint & Record<string, number>>
  weekdayData: WeekdayData[]
  tokenChartData: TokenChartDataPoint[]
  tokenPieData: Array<{ name: string; value: number }>
  requestChartData: RequestChartDataPoint[]
  comparisonData: DailyUsage[]
  modelCosts: Map<
    string,
    {
      cost: number
      tokens: number
      input: number
      output: number
      cacheRead: number
      cacheCreate: number
      thinking: number
      requests: number
      days: number
    }
  >
  providerMetrics: Map<string, AggregateMetrics>
  onDrillDownDateChange: (date: string | null) => void
}

export function DashboardSections({
  sectionOrder,
  sectionVisibility,
  metrics,
  viewMode,
  totalCalendarDays,
  filteredData,
  filteredDailyData,
  todayData,
  hasCurrentMonthData,
  visibleLimitProviders,
  providerLimits,
  selectedMonth,
  allModels,
  costChartData,
  modelPieData,
  modelCostChartData,
  weekdayData,
  tokenChartData,
  tokenPieData,
  requestChartData,
  comparisonData,
  modelCosts,
  providerMetrics,
  onDrillDownDateChange,
}: DashboardSectionsProps) {
  const { t } = useTranslation()

  const renderSection = (sectionId: DashboardSectionId) => {
    switch (sectionId) {
      case 'insights':
        return sectionVisibility.insights ? (
          <div id="insights">
            <UsageInsights
              metrics={metrics}
              viewMode={viewMode}
              totalCalendarDays={totalCalendarDays}
            />
          </div>
        ) : null
      case 'metrics':
        return sectionVisibility.metrics ? (
          <div id="metrics">
            <SectionHeader
              title={t('dashboard.metrics.title')}
              badge={t('dashboard.metrics.badge')}
              description={t('dashboard.metrics.description')}
              info={SECTION_HELP.metrics}
            />
            <FadeIn delay={0}>
              <PrimaryMetrics
                metrics={metrics}
                totalCalendarDays={totalCalendarDays}
                viewMode={viewMode}
              />
            </FadeIn>
            <FadeIn delay={0.04}>
              <div className="mt-4">
                <SecondaryMetrics
                  metrics={metrics}
                  dailyCosts={filteredData.map((entry) => entry.totalCost)}
                  viewMode={viewMode}
                />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'today':
        return sectionVisibility.today && todayData ? (
          <div id="today">
            <TodayMetrics today={todayData} metrics={metrics} />
          </div>
        ) : null
      case 'currentMonth':
        return sectionVisibility.currentMonth && hasCurrentMonthData ? (
          <div id="current-month">
            <MonthMetrics daily={filteredDailyData} metrics={metrics} />
          </div>
        ) : null
      case 'activity':
        return sectionVisibility.activity ? (
          <div id="activity">
            <SectionHeader
              title={t('dashboard.activity.title')}
              description={
                viewMode === 'daily'
                  ? t('dashboard.activity.dailyDescription')
                  : viewMode === 'monthly'
                    ? t('dashboard.activity.monthlyDescription')
                    : t('dashboard.activity.yearlyDescription')
              }
              info={SECTION_HELP.activity}
            />
            <FadeIn delay={0.05}>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="cost" />
                <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="requests" />
                <HeatmapCalendar data={filteredData} viewMode={viewMode} metric="tokens" />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'forecastCache':
        return sectionVisibility.forecastCache ? (
          <div id="forecast-cache">
            <SectionHeader
              title={t('dashboard.forecastCache.title')}
              description={t('dashboard.forecastCache.description')}
              info={SECTION_HELP.forecastCache}
            />
            <FadeIn delay={0.06}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExpandableCard title={t('dashboard.cards.costForecast')}>
                  <CostForecast data={filteredData} viewMode={viewMode} />
                </ExpandableCard>
                <ExpandableCard
                  title={t('dashboard.cards.cacheRoi')}
                  stats={[
                    {
                      label: t('dashboard.stats.cacheHitRate'),
                      value: formatPercent(metrics.cacheHitRate),
                    },
                    {
                      label: t('dashboard.stats.totalTokens'),
                      value: formatTokens(metrics.totalTokens),
                    },
                    {
                      label: t('dashboard.stats.cacheRead'),
                      value: formatTokens(metrics.totalCacheRead),
                    },
                  ]}
                >
                  <CacheROI data={filteredData} viewMode={viewMode} />
                </ExpandableCard>
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'limits':
        return sectionVisibility.limits ? (
          <div id="limits">
            <FadeIn delay={0.07}>
              <ProviderLimitsSection
                data={filteredDailyData}
                providers={visibleLimitProviders}
                limits={providerLimits}
                selectedMonth={selectedMonth}
              />
            </FadeIn>
          </div>
        ) : null
      case 'costAnalysis':
        return sectionVisibility.costAnalysis ? (
          <div id="charts">
            <SectionHeader
              title={t('dashboard.costAnalysis.title')}
              badge={`${allModels.length} ${t('common.models')}`}
              description={t('dashboard.costAnalysis.description')}
              info={SECTION_HELP.costAnalysis}
            />
            <FadeIn delay={0.08}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <CostOverTime data={costChartData} onClickDay={onDrillDownDateChange} />
                </div>
                <CostByModel data={modelPieData} />
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mt-4">
                <CostByModelOverTime data={modelCostChartData} models={allModels} />
              </div>
            </FadeIn>
            <FadeIn delay={0.11}>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CumulativeCost data={costChartData} rawData={filteredData} />
                <CostByWeekday data={weekdayData} />
              </div>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TokenEfficiency data={filteredData} />
                <ModelMix data={filteredData} />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'tokenAnalysis':
        return sectionVisibility.tokenAnalysis ? (
          <div id="token-analysis">
            <SectionHeader
              title={t('dashboard.tokenAnalysis.title')}
              description={t('dashboard.tokenAnalysis.description')}
              info={SECTION_HELP.tokenAnalysis}
            />
            <FadeIn delay={0.13}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TokensOverTime data={tokenChartData} onClickDay={onDrillDownDateChange} />
                <TokenTypes data={tokenPieData} />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'requestAnalysis':
        return sectionVisibility.requestAnalysis && metrics.hasRequestData ? (
          <div id="request-analysis">
            <SectionHeader
              title={t('dashboard.requestAnalysis.title')}
              description={t('dashboard.requestAnalysis.description')}
              info={SECTION_HELP.requestAnalysis}
            />
            <FadeIn delay={0.14}>
              <RequestsOverTime
                data={requestChartData}
                viewMode={viewMode}
                onClickDay={onDrillDownDateChange}
              />
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="mt-4">
                <RequestCacheHitRateByModel
                  timelineData={filteredData}
                  summaryData={filteredDailyData}
                  viewMode={viewMode}
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.16}>
              <div className="mt-4">
                <RequestQuality metrics={metrics} viewMode={viewMode} />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'advancedAnalysis':
        return sectionVisibility.advancedAnalysis ? (
          <div id="advanced-analysis">
            <SectionHeader
              title={t('dashboard.advancedAnalysis.title')}
              description={t('dashboard.advancedAnalysis.description')}
              info={SECTION_HELP.advancedAnalysis}
            />
            <FadeIn delay={0.145}>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DistributionAnalysis data={filteredData} viewMode={viewMode} />
                <ConcentrationRisk
                  topModelShare={metrics.topModelShare}
                  topProviderShare={metrics.topProvider?.share ?? 0}
                  modelConcentrationIndex={metrics.modelConcentrationIndex}
                  providerConcentrationIndex={metrics.providerConcentrationIndex}
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.155}>
              <div className="mt-4">
                <CorrelationAnalysis data={filteredData} />
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'comparisons':
        return sectionVisibility.comparisons ? (
          <div id="comparisons">
            <SectionHeader
              title={t('dashboard.comparisons.title')}
              description={t('dashboard.comparisons.description')}
              info={SECTION_HELP.comparisons}
            />
            <FadeIn delay={0.165}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExpandableCard
                  title={t('dashboard.cards.periodComparison')}
                  stats={[
                    { label: t('dashboard.stats.dataPoints'), value: String(filteredData.length) },
                    {
                      label: t('dashboard.stats.avgCostPerUnit', { unit: periodUnit(viewMode) }),
                      value: formatCurrency(metrics.avgDailyCost),
                    },
                  ]}
                >
                  <PeriodComparison data={comparisonData} />
                </ExpandableCard>
                <ExpandableCard
                  title={t('dashboard.cards.anomalyDetection')}
                  stats={[
                    { label: t('dashboard.stats.total'), value: formatCurrency(metrics.totalCost) },
                    {
                      label: t('dashboard.stats.avgPerUnit', { unit: periodUnit(viewMode) }),
                      value: formatCurrency(metrics.avgDailyCost),
                    },
                  ]}
                >
                  <AnomalyDetection
                    data={filteredData}
                    onClickDay={onDrillDownDateChange}
                    viewMode={viewMode}
                  />
                </ExpandableCard>
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'tables':
        return sectionVisibility.tables ? (
          <div id="tables">
            <SectionHeader
              title={t('dashboard.tables.title')}
              description={t('dashboard.tables.description')}
              info={SECTION_HELP.tables}
            />
            <FadeIn delay={0.17}>
              <ModelEfficiency
                modelCosts={modelCosts}
                totalCost={metrics.totalCost}
                viewMode={viewMode}
              />
            </FadeIn>
            <FadeIn delay={0.18}>
              <div className="mt-4">
                <ProviderEfficiency
                  providerMetrics={providerMetrics}
                  totalCost={metrics.totalCost}
                  viewMode={viewMode}
                />
              </div>
            </FadeIn>
            <FadeIn delay={0.19}>
              <div className="mt-4">
                <RecentDays
                  data={filteredData}
                  onClickDay={onDrillDownDateChange}
                  viewMode={viewMode}
                />
              </div>
            </FadeIn>
          </div>
        ) : null
      default:
        return null
    }
  }

  return (
    <>
      {sectionOrder.map((sectionId) => (
        <Fragment key={sectionId}>{renderSection(sectionId)}</Fragment>
      ))}
    </>
  )
}
