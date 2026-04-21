import {
  Fragment,
  Suspense,
  lazy,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react'
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
import { SectionHeader } from '../ui/section-header'
import { ExpandableCard } from '../ui/expandable-card'
import { ChartCardSkeleton } from '../ui/skeleton'
import { ErrorBoundary } from '../ui/error-boundary'
import { AnimatedDashboardSection } from './DashboardMotion'
import { SECTION_HELP } from '@/lib/help-content'
import { cn } from '@/lib/cn'
import type { ModelCostChartPoint } from '@/lib/data-transforms'
import type { DashboardForecastState } from '@/lib/calculations'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreloadableLazyComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithPreload<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): PreloadableLazyComponent<T> {
  const Component = lazy(loader) as PreloadableLazyComponent<T>
  Component.preload = loader
  return Component
}

function preloadComponents(
  ...components: Array<{ preload: () => Promise<unknown> }>
): Promise<unknown[]> {
  return Promise.all(components.map((component) => component.preload()))
}

const CostForecast = lazyWithPreload(() =>
  import('../features/forecast/CostForecast').then((module) => ({
    default: module.CostForecast,
  })),
)
const ProviderCostForecast = lazyWithPreload(() =>
  import('../features/forecast/ProviderCostForecast').then((module) => ({
    default: module.ProviderCostForecast,
  })),
)
const ForecastZoomDialog = lazyWithPreload(() =>
  import('../features/forecast/ForecastZoomDialog').then((module) => ({
    default: module.ForecastZoomDialog,
  })),
)
const CostByModelOverTime = lazyWithPreload(() =>
  import('../charts/CostByModelOverTime').then((module) => ({
    default: module.CostByModelOverTime,
  })),
)
const CumulativeCost = lazyWithPreload(() =>
  import('../charts/CumulativeCost').then((module) => ({
    default: module.CumulativeCost,
  })),
)
const CostByWeekday = lazyWithPreload(() =>
  import('../charts/CostByWeekday').then((module) => ({
    default: module.CostByWeekday,
  })),
)
const TokenEfficiency = lazyWithPreload(() =>
  import('../charts/TokenEfficiency').then((module) => ({
    default: module.TokenEfficiency,
  })),
)
const ModelMix = lazyWithPreload(() =>
  import('../charts/ModelMix').then((module) => ({
    default: module.ModelMix,
  })),
)
const TokensOverTime = lazyWithPreload(() =>
  import('../charts/TokensOverTime').then((module) => ({
    default: module.TokensOverTime,
  })),
)
const TokenTypes = lazyWithPreload(() =>
  import('../charts/TokenTypes').then((module) => ({
    default: module.TokenTypes,
  })),
)
const RequestsOverTime = lazyWithPreload(() =>
  import('../charts/RequestsOverTime').then((module) => ({
    default: module.RequestsOverTime,
  })),
)
const RequestCacheHitRateByModel = lazyWithPreload(() =>
  import('../charts/RequestCacheHitRateByModel').then((module) => ({
    default: module.RequestCacheHitRateByModel,
  })),
)
const CacheROI = lazyWithPreload(() =>
  import('../features/cache-roi/CacheROI').then((module) => ({
    default: module.CacheROI,
  })),
)
const ProviderLimitsSection = lazyWithPreload(() =>
  import('../features/limits/ProviderLimitsSection').then((module) => ({
    default: module.ProviderLimitsSection,
  })),
)
const RequestQuality = lazyWithPreload(() =>
  import('../features/request-quality/RequestQuality').then((module) => ({
    default: module.RequestQuality,
  })),
)
const DistributionAnalysis = lazyWithPreload(() =>
  import('../charts/DistributionAnalysis').then((module) => ({
    default: module.DistributionAnalysis,
  })),
)
const CorrelationAnalysis = lazyWithPreload(() =>
  import('../charts/CorrelationAnalysis').then((module) => ({
    default: module.CorrelationAnalysis,
  })),
)
const PeriodComparison = lazyWithPreload(() =>
  import('../features/comparison/PeriodComparison').then((module) => ({
    default: module.PeriodComparison,
  })),
)
const AnomalyDetection = lazyWithPreload(() =>
  import('../features/anomaly/AnomalyDetection').then((module) => ({
    default: module.AnomalyDetection,
  })),
)
const ModelEfficiency = lazyWithPreload(() =>
  import('../tables/ModelEfficiency').then((module) => ({
    default: module.ModelEfficiency,
  })),
)
const ProviderEfficiency = lazyWithPreload(() =>
  import('../tables/ProviderEfficiency').then((module) => ({
    default: module.ProviderEfficiency,
  })),
)
const RecentDays = lazyWithPreload(() =>
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
  forecastState: DashboardForecastState
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
  forecastState,
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
  const [forecastZoomOpen, setForecastZoomOpen] = useState(false)

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

  const renderLazySection = (content: ReactNode, className?: string) => (
    <ErrorBoundary fallback={lazyErrorFallback(className)}>
      <Suspense fallback={lazyCardFallback(className)}>{content}</Suspense>
    </ErrorBoundary>
  )

  const sectionPlaceholderClassName: Record<DashboardSectionId, string> = {
    insights: 'min-h-[260px]',
    metrics: 'min-h-[320px]',
    today: 'min-h-[320px]',
    currentMonth: 'min-h-[360px]',
    activity: 'min-h-[360px]',
    forecastCache: 'min-h-[800px]',
    limits: 'min-h-[480px]',
    costAnalysis: 'min-h-[980px]',
    tokenAnalysis: 'min-h-[380px]',
    requestAnalysis: 'min-h-[760px]',
    advancedAnalysis: 'min-h-[760px]',
    comparisons: 'min-h-[420px]',
    tables: 'min-h-[900px]',
  }
  const sectionAnchorMap: Partial<Record<DashboardSectionId, string>> = {
    costAnalysis: 'charts',
    currentMonth: 'current-month',
    tokenAnalysis: 'token-analysis',
    requestAnalysis: 'request-analysis',
    advancedAnalysis: 'advanced-analysis',
  }

  const renderAnimatedSection = (
    sectionId: DashboardSectionId,
    children: ReactNode,
    {
      eager = false,
      onPreload,
    }: { eager?: boolean; onPreload?: () => void | Promise<unknown> } = {},
  ) => {
    const sectionAnchorId = sectionAnchorMap[sectionId] ?? sectionId

    return (
      <AnimatedDashboardSection
        id={sectionAnchorId}
        eager={eager}
        placeholderClassName={sectionPlaceholderClassName[sectionId]}
        onPreload={onPreload}
      >
        {children}
      </AnimatedDashboardSection>
    )
  }

  const renderSection = (sectionId: DashboardSectionId) => {
    switch (sectionId) {
      case 'insights':
        return sectionVisibility.insights
          ? renderAnimatedSection(
              'insights',
              <UsageInsights
                metrics={metrics}
                viewMode={viewMode}
                totalCalendarDays={totalCalendarDays}
              />,
              { eager: true },
            )
          : null
      case 'metrics':
        return sectionVisibility.metrics
          ? renderAnimatedSection(
              'metrics',
              <>
                <SectionHeader
                  title={t('dashboard.metrics.title')}
                  badge={t('dashboard.metrics.badge')}
                  description={t('dashboard.metrics.description')}
                  info={SECTION_HELP.metrics}
                />
                <PrimaryMetrics
                  metrics={metrics}
                  totalCalendarDays={totalCalendarDays}
                  viewMode={viewMode}
                />
                <div className="mt-4">
                  <SecondaryMetrics
                    metrics={metrics}
                    dailyCosts={filteredData.map((entry) => entry.totalCost)}
                    viewMode={viewMode}
                  />
                </div>
              </>,
              { eager: true },
            )
          : null
      case 'today':
        return sectionVisibility.today && todayData
          ? renderAnimatedSection('today', <TodayMetrics today={todayData} metrics={metrics} />, {
              eager: true,
            })
          : null
      case 'currentMonth':
        return sectionVisibility.currentMonth && hasCurrentMonthData
          ? renderAnimatedSection(
              'currentMonth',
              <MonthMetrics daily={filteredDailyData} metrics={metrics} />,
              {
                eager: true,
              },
            )
          : null
      case 'activity':
        return sectionVisibility.activity
          ? renderAnimatedSection(
              'activity',
              <>
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
              </>,
            )
          : null
      case 'forecastCache':
        return sectionVisibility.forecastCache
          ? renderAnimatedSection(
              'forecastCache',
              <>
                <SectionHeader
                  title={t('dashboard.forecastCache.title')}
                  description={t('dashboard.forecastCache.description')}
                  info={SECTION_HELP.forecastCache}
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(
                    <ExpandableCard
                      title={t('dashboard.cards.costForecast')}
                      onExpand={() => setForecastZoomOpen(true)}
                    >
                      <CostForecast
                        data={filteredData}
                        forecast={forecastState.costForecast}
                        viewMode={viewMode}
                        expandable={false}
                      />
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
                <div className="mt-4">
                  {renderLazySection(
                    <ExpandableCard
                      title={t('dashboard.cards.providerForecast')}
                      onExpand={() => setForecastZoomOpen(true)}
                    >
                      <ProviderCostForecast
                        forecast={forecastState.providerForecast}
                        viewMode={viewMode}
                        expandable={false}
                      />
                    </ExpandableCard>,
                    'h-[430px]',
                  )}
                </div>
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <ForecastZoomDialog
                      open={forecastZoomOpen}
                      onOpenChange={setForecastZoomOpen}
                      data={filteredData}
                      forecastState={forecastState}
                      viewMode={viewMode}
                    />
                  </Suspense>
                </ErrorBoundary>
              </>,
              {
                onPreload: () => {
                  return preloadComponents(
                    CostForecast,
                    ProviderCostForecast,
                    ForecastZoomDialog,
                    CacheROI,
                  )
                },
              },
            )
          : null
      case 'limits':
        return sectionVisibility.limits
          ? renderAnimatedSection(
              'limits',
              renderLazySection(
                <ProviderLimitsSection
                  data={filteredDailyData}
                  providers={visibleLimitProviders}
                  limits={providerLimits}
                  selectedMonth={selectedMonth}
                />,
                'h-[420px]',
              ),
              {
                onPreload: () => {
                  return preloadComponents(ProviderLimitsSection)
                },
              },
            )
          : null
      case 'costAnalysis':
        return sectionVisibility.costAnalysis
          ? renderAnimatedSection(
              'costAnalysis',
              <>
                <SectionHeader
                  title={t('dashboard.costAnalysis.title')}
                  badge={`${allModels.length} ${t('common.models')}`}
                  description={t('dashboard.costAnalysis.description')}
                  info={SECTION_HELP.costAnalysis}
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <CostOverTime data={costChartData} onClickDay={onDrillDownDateChange} />
                  </div>
                  <CostByModel data={modelPieData} />
                </div>
                <div className="mt-4">
                  {renderLazySection(
                    <CostByModelOverTime data={modelCostChartData} models={allModels} />,
                    'h-[320px]',
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(
                    <CumulativeCost data={costChartData} forecast={forecastState.costForecast} />,
                    'h-[320px]',
                  )}
                  {renderLazySection(<CostByWeekday data={weekdayData} />, 'h-[320px]')}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(<TokenEfficiency data={filteredData} />, 'h-[320px]')}
                  {renderLazySection(<ModelMix data={filteredData} />, 'h-[320px]')}
                </div>
              </>,
              {
                onPreload: () => {
                  return preloadComponents(
                    CostByModelOverTime,
                    CumulativeCost,
                    CostByWeekday,
                    TokenEfficiency,
                    ModelMix,
                  )
                },
              },
            )
          : null
      case 'tokenAnalysis':
        return sectionVisibility.tokenAnalysis
          ? renderAnimatedSection(
              'tokenAnalysis',
              <>
                <SectionHeader
                  title={t('dashboard.tokenAnalysis.title')}
                  description={t('dashboard.tokenAnalysis.description')}
                  info={SECTION_HELP.tokenAnalysis}
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {renderLazySection(
                    <TokensOverTime data={tokenChartData} onClickDay={onDrillDownDateChange} />,
                    'h-[320px]',
                  )}
                  {renderLazySection(<TokenTypes data={tokenPieData} />, 'h-[320px]')}
                </div>
              </>,
              {
                onPreload: () => {
                  return preloadComponents(TokensOverTime, TokenTypes)
                },
              },
            )
          : null
      case 'requestAnalysis':
        return sectionVisibility.requestAnalysis && metrics.hasRequestData
          ? renderAnimatedSection(
              'requestAnalysis',
              <>
                <SectionHeader
                  title={t('dashboard.requestAnalysis.title')}
                  description={t('dashboard.requestAnalysis.description')}
                  info={SECTION_HELP.requestAnalysis}
                />
                {renderLazySection(
                  <RequestsOverTime
                    data={requestChartData}
                    viewMode={viewMode}
                    onClickDay={onDrillDownDateChange}
                  />,
                  'h-[320px]',
                )}
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
                <div className="mt-4">
                  {renderLazySection(
                    <RequestQuality metrics={metrics} viewMode={viewMode} />,
                    'h-[280px]',
                  )}
                </div>
              </>,
              {
                onPreload: () => {
                  return preloadComponents(
                    RequestsOverTime,
                    RequestCacheHitRateByModel,
                    RequestQuality,
                  )
                },
              },
            )
          : null
      case 'advancedAnalysis':
        return sectionVisibility.advancedAnalysis
          ? renderAnimatedSection(
              'advancedAnalysis',
              <>
                <SectionHeader
                  title={t('dashboard.advancedAnalysis.title')}
                  description={t('dashboard.advancedAnalysis.description')}
                  info={SECTION_HELP.advancedAnalysis}
                />
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
                <div className="mt-4">
                  {renderLazySection(<CorrelationAnalysis data={filteredData} />, 'h-[320px]')}
                </div>
              </>,
              {
                onPreload: () => {
                  return preloadComponents(DistributionAnalysis, CorrelationAnalysis)
                },
              },
            )
          : null
      case 'comparisons':
        return sectionVisibility.comparisons
          ? renderAnimatedSection(
              'comparisons',
              <>
                <SectionHeader
                  title={t('dashboard.comparisons.title')}
                  description={t('dashboard.comparisons.description')}
                  info={SECTION_HELP.comparisons}
                />
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
                          label: t('dashboard.stats.avgCostPerUnit', {
                            unit: periodUnit(viewMode),
                          }),
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
              </>,
              {
                onPreload: () => {
                  return preloadComponents(PeriodComparison, AnomalyDetection)
                },
              },
            )
          : null
      case 'tables':
        return sectionVisibility.tables
          ? renderAnimatedSection(
              'tables',
              <>
                <SectionHeader
                  title={t('dashboard.tables.title')}
                  description={t('dashboard.tables.description')}
                  info={SECTION_HELP.tables}
                />
                {renderLazySection(
                  <ModelEfficiency
                    modelCosts={modelCosts}
                    totalCost={metrics.totalCost}
                    viewMode={viewMode}
                  />,
                  'h-[320px]',
                )}
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
              </>,
              {
                onPreload: () => {
                  return preloadComponents(ModelEfficiency, ProviderEfficiency, RecentDays)
                },
              },
            )
          : null
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
