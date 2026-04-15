import { Fragment, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { PrimaryMetrics } from '../cards/PrimaryMetrics'
import { SecondaryMetrics } from '../cards/SecondaryMetrics'
import { TodayMetrics } from '../cards/TodayMetrics'
import { MonthMetrics } from '../cards/MonthMetrics'
import { CostOverTime } from '../charts/CostOverTime'
import { CostByModel } from '../charts/CostByModel'
import { HeatmapCalendar } from '../features/heatmap/HeatmapCalendar'
import { UsageInsights } from '../features/insights/UsageInsights'
import { ConcentrationRisk } from '../features/risk/ConcentrationRisk'
import { FadeIn } from '../features/animations/FadeIn'
import { SectionHeader } from '../ui/section-header'
import { ExpandableCard } from '../ui/expandable-card'
import { ChartCardSkeleton } from '../ui/skeleton'
import { ErrorBoundary } from '../ui/error-boundary'
import { SECTION_HELP } from '@/lib/help-content'
import { cn } from '@/lib/cn'
import type { ModelCostChartPoint } from '@/lib/data-transforms'
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

const CostForecast = lazy(() =>
  import('../features/forecast/CostForecast').then((module) => ({
    default: module.CostForecast,
  })),
)
const CostByModelOverTime = lazy(() =>
  import('../charts/CostByModelOverTime').then((module) => ({
    default: module.CostByModelOverTime,
  })),
)
const CumulativeCost = lazy(() =>
  import('../charts/CumulativeCost').then((module) => ({
    default: module.CumulativeCost,
  })),
)
const CostByWeekday = lazy(() =>
  import('../charts/CostByWeekday').then((module) => ({
    default: module.CostByWeekday,
  })),
)
const TokenEfficiency = lazy(() =>
  import('../charts/TokenEfficiency').then((module) => ({
    default: module.TokenEfficiency,
  })),
)
const ModelMix = lazy(() =>
  import('../charts/ModelMix').then((module) => ({
    default: module.ModelMix,
  })),
)
const TokensOverTime = lazy(() =>
  import('../charts/TokensOverTime').then((module) => ({
    default: module.TokensOverTime,
  })),
)
const TokenTypes = lazy(() =>
  import('../charts/TokenTypes').then((module) => ({
    default: module.TokenTypes,
  })),
)
const RequestsOverTime = lazy(() =>
  import('../charts/RequestsOverTime').then((module) => ({
    default: module.RequestsOverTime,
  })),
)
const RequestCacheHitRateByModel = lazy(() =>
  import('../charts/RequestCacheHitRateByModel').then((module) => ({
    default: module.RequestCacheHitRateByModel,
  })),
)
const CacheROI = lazy(() =>
  import('../features/cache-roi/CacheROI').then((module) => ({
    default: module.CacheROI,
  })),
)
const ProviderLimitsSection = lazy(() =>
  import('../features/limits/ProviderLimitsSection').then((module) => ({
    default: module.ProviderLimitsSection,
  })),
)
const RequestQuality = lazy(() =>
  import('../features/request-quality/RequestQuality').then((module) => ({
    default: module.RequestQuality,
  })),
)
const DistributionAnalysis = lazy(() =>
  import('../charts/DistributionAnalysis').then((module) => ({
    default: module.DistributionAnalysis,
  })),
)
const CorrelationAnalysis = lazy(() =>
  import('../charts/CorrelationAnalysis').then((module) => ({
    default: module.CorrelationAnalysis,
  })),
)
const PeriodComparison = lazy(() =>
  import('../features/comparison/PeriodComparison').then((module) => ({
    default: module.PeriodComparison,
  })),
)
const AnomalyDetection = lazy(() =>
  import('../features/anomaly/AnomalyDetection').then((module) => ({
    default: module.AnomalyDetection,
  })),
)
const ModelEfficiency = lazy(() =>
  import('../tables/ModelEfficiency').then((module) => ({
    default: module.ModelEfficiency,
  })),
)
const ProviderEfficiency = lazy(() =>
  import('../tables/ProviderEfficiency').then((module) => ({
    default: module.ProviderEfficiency,
  })),
)
const RecentDays = lazy(() =>
  import('../tables/RecentDays').then((module) => ({
    default: module.RecentDays,
  })),
)

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
  modelCostChartData: ModelCostChartPoint[]
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
  isDark: boolean
  onDrillDownDateChange: (date: string | null) => void
}

/** Renders the ordered dashboard sections for the active filters and settings. */
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
  isDark,
  onDrillDownDateChange,
}: DashboardSectionsProps) {
  const { t } = useTranslation()

  const lazyCardFallback = (className?: string) => (
    <ChartCardSkeleton
      className={className ?? 'h-[360px]'}
      bodyClassName={className ?? 'h-[360px]'}
    />
  )

  const lazyErrorFallback = (className?: string) => (
    <div
      role="alert"
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-border/50 bg-card/80 px-6 py-8 text-center backdrop-blur-xl',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{t('dashboard.lazySectionError.title')}</p>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground">
        {t('dashboard.lazySectionError.description')}
      </p>
    </div>
  )

  const renderLazySection = (content: React.ReactNode, className?: string) => (
    <ErrorBoundary fallback={lazyErrorFallback(className)}>
      <Suspense fallback={lazyCardFallback(className)}>{content}</Suspense>
    </ErrorBoundary>
  )

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
                <HeatmapCalendar
                  data={filteredData}
                  viewMode={viewMode}
                  metric="cost"
                  isDark={isDark}
                />
                <HeatmapCalendar
                  data={filteredData}
                  viewMode={viewMode}
                  metric="requests"
                  isDark={isDark}
                />
                <HeatmapCalendar
                  data={filteredData}
                  viewMode={viewMode}
                  metric="tokens"
                  isDark={isDark}
                />
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
                {renderLazySection(
                  <ExpandableCard title={t('dashboard.cards.costForecast')}>
                    <CostForecast data={filteredData} viewMode={viewMode} />
                  </ExpandableCard>,
                  'h-[360px]',
                )}
                {renderLazySection(
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
                  </ExpandableCard>,
                  'h-[360px]',
                )}
              </div>
            </FadeIn>
          </div>
        ) : null
      case 'limits':
        return sectionVisibility.limits ? (
          <div id="limits">
            <FadeIn delay={0.07}>
              {renderLazySection(
                <ProviderLimitsSection
                  data={filteredDailyData}
                  providers={visibleLimitProviders}
                  limits={providerLimits}
                  selectedMonth={selectedMonth}
                />,
                'h-[420px]',
              )}
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
                {renderLazySection(
                  <CostByModelOverTime data={modelCostChartData} models={allModels} />,
                  'h-[320px]',
                )}
              </div>
            </FadeIn>
            <FadeIn delay={0.11}>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {renderLazySection(
                  <CumulativeCost data={costChartData} rawData={filteredData} />,
                  'h-[320px]',
                )}
                {renderLazySection(<CostByWeekday data={weekdayData} />, 'h-[320px]')}
              </div>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {renderLazySection(<TokenEfficiency data={filteredData} />, 'h-[320px]')}
                {renderLazySection(<ModelMix data={filteredData} />, 'h-[320px]')}
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
                {renderLazySection(
                  <TokensOverTime data={tokenChartData} onClickDay={onDrillDownDateChange} />,
                  'h-[320px]',
                )}
                {renderLazySection(<TokenTypes data={tokenPieData} />, 'h-[320px]')}
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
              {renderLazySection(
                <RequestsOverTime
                  data={requestChartData}
                  viewMode={viewMode}
                  onClickDay={onDrillDownDateChange}
                />,
                'h-[320px]',
              )}
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="mt-4">
                {renderLazySection(
                  <RequestCacheHitRateByModel
                    timelineData={filteredData}
                    summaryData={filteredDailyData}
                    viewMode={viewMode}
                  />,
                  'h-[320px]',
                )}
              </div>
            </FadeIn>
            <FadeIn delay={0.16}>
              <div className="mt-4">
                {renderLazySection(
                  <RequestQuality metrics={metrics} viewMode={viewMode} />,
                  'h-[280px]',
                )}
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
                {renderLazySection(
                  <DistributionAnalysis data={filteredData} viewMode={viewMode} />,
                  'h-[320px]',
                )}
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
                {renderLazySection(<CorrelationAnalysis data={filteredData} />, 'h-[320px]')}
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
                {renderLazySection(
                  <ExpandableCard
                    title={t('dashboard.cards.periodComparison')}
                    stats={[
                      {
                        label: t('dashboard.stats.dataPoints'),
                        value: String(filteredData.length),
                      },
                      {
                        label: t('dashboard.stats.avgCostPerUnit', { unit: periodUnit(viewMode) }),
                        value: formatCurrency(metrics.avgDailyCost),
                      },
                    ]}
                  >
                    <PeriodComparison data={comparisonData} />
                  </ExpandableCard>,
                  'h-[360px]',
                )}
                {renderLazySection(
                  <ExpandableCard
                    title={t('dashboard.cards.anomalyDetection')}
                    stats={[
                      {
                        label: t('dashboard.stats.total'),
                        value: formatCurrency(metrics.totalCost),
                      },
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
                  </ExpandableCard>,
                  'h-[360px]',
                )}
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
              {renderLazySection(
                <ModelEfficiency
                  modelCosts={modelCosts}
                  totalCost={metrics.totalCost}
                  viewMode={viewMode}
                />,
                'h-[320px]',
              )}
            </FadeIn>
            <FadeIn delay={0.18}>
              <div className="mt-4">
                {renderLazySection(
                  <ProviderEfficiency
                    providerMetrics={providerMetrics}
                    totalCost={metrics.totalCost}
                    viewMode={viewMode}
                  />,
                  'h-[320px]',
                )}
              </div>
            </FadeIn>
            <FadeIn delay={0.19}>
              <div className="mt-4">
                {renderLazySection(
                  <RecentDays
                    data={filteredData}
                    onClickDay={onDrillDownDateChange}
                    viewMode={viewMode}
                  />,
                  'h-[360px]',
                )}
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
