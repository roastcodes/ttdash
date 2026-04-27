import {
  Fragment,
  Suspense,
  lazy,
  useEffect,
  useMemo,
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
import { HeatmapCalendar } from '../features/heatmap/HeatmapCalendar'
import { UsageInsights } from '../features/insights/UsageInsights'
import { ConcentrationRisk } from '../features/risk/ConcentrationRisk'
import { SectionHeader } from '../ui/section-header'
import { ExpandableCard } from '../ui/expandable-card'
import { ChartCardSkeleton } from '../ui/skeleton'
import { ErrorBoundary } from '../ui/error-boundary'
import { AnimatedDashboardSection, scheduleDashboardPreloads } from './DashboardMotion'
import {
  resolveDashboardSectionPreloadTasks,
  type DashboardSectionPreloaders,
} from './dashboard-section-preloading'
import { SECTION_HELP } from '@/lib/help-content'
import { cn } from '@/lib/cn'
import type { DashboardSectionsViewModel } from '@/types/dashboard-view-model'
import { formatCurrency, formatPercent, formatTokens, periodUnit } from '@/lib/formatters'
import type { DashboardSectionId } from '@/types'

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
const CostOverTime = lazyWithPreload(() =>
  import('../charts/CostOverTime').then((module) => ({
    default: module.CostOverTime,
  })),
)
const CostByModel = lazyWithPreload(() =>
  import('../charts/CostByModel').then((module) => ({
    default: module.CostByModel,
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
const CumulativeCostPerProvider = lazyWithPreload(() =>
  import('../charts/CumulativeCostPerProvider').then((module) => ({
    default: module.CumulativeCostPerProvider,
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

const dashboardSectionPreloaders = {
  forecastCache: () =>
    preloadComponents(CostForecast, ProviderCostForecast, ForecastZoomDialog, CacheROI),
  limits: () => preloadComponents(ProviderLimitsSection),
  costAnalysis: () =>
    preloadComponents(
      CostOverTime,
      CostByModel,
      CumulativeCostPerProvider,
      CostByModelOverTime,
      CumulativeCost,
      CostByWeekday,
      TokenEfficiency,
      ModelMix,
    ),
  tokenAnalysis: () => preloadComponents(TokensOverTime, TokenTypes),
  requestAnalysis: () =>
    preloadComponents(RequestsOverTime, RequestCacheHitRateByModel, RequestQuality),
  advancedAnalysis: () => preloadComponents(DistributionAnalysis, CorrelationAnalysis),
  comparisons: () => preloadComponents(PeriodComparison, AnomalyDetection),
  tables: () => preloadComponents(ModelEfficiency, ProviderEfficiency, RecentDays),
} satisfies DashboardSectionPreloaders

interface DashboardSectionsProps {
  viewModel: DashboardSectionsViewModel
}

/** Renders the ordered dashboard sections for the active filters and settings. */
export function DashboardSections({ viewModel }: DashboardSectionsProps) {
  const { t } = useTranslation()
  const [forecastZoomOpen, setForecastZoomOpen] = useState(false)
  const {
    layout,
    overview,
    forecast,
    limits,
    costAnalysis,
    tokenAnalysis,
    requestAnalysis,
    advancedAnalysis,
    comparisons,
    tables,
    interactions,
  } = viewModel
  const { sectionOrder, sectionVisibility } = layout
  const warmupPreloadTasks = useMemo(
    () =>
      resolveDashboardSectionPreloadTasks({
        sectionOrder,
        sectionVisibility,
        preloaders: dashboardSectionPreloaders,
        requestAnalysisEnabled: requestAnalysis.metrics.hasRequestData,
      }),
    [requestAnalysis.metrics.hasRequestData, sectionOrder, sectionVisibility],
  )

  useEffect(() => {
    if (warmupPreloadTasks.length === 0) return

    const preloadHandle = scheduleDashboardPreloads(warmupPreloadTasks)
    return () => {
      preloadHandle.cancel()
    }
  }, [warmupPreloadTasks])

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
    forecastCache: 'min-h-[900px]',
    limits: 'min-h-[480px]',
    costAnalysis: 'min-h-[1460px]',
    tokenAnalysis: 'min-h-[430px]',
    requestAnalysis: 'min-h-[1040px]',
    advancedAnalysis: 'min-h-[760px]',
    comparisons: 'min-h-[480px]',
    tables: 'min-h-[1100px]',
  }
  const sectionAnchorMap: Partial<Record<DashboardSectionId, string>> = {
    costAnalysis: 'charts',
    currentMonth: 'current-month',
    forecastCache: 'forecast-cache',
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
                metrics={overview.metrics}
                viewMode={overview.viewMode}
                totalCalendarDays={overview.totalCalendarDays}
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
                  metrics={overview.metrics}
                  totalCalendarDays={overview.totalCalendarDays}
                  viewMode={overview.viewMode}
                />
                <div className="mt-4">
                  <SecondaryMetrics
                    metrics={overview.metrics}
                    dailyCosts={overview.filteredData.map((entry) => entry.totalCost)}
                    viewMode={overview.viewMode}
                  />
                </div>
              </>,
              { eager: true },
            )
          : null
      case 'today':
        return sectionVisibility.today && overview.todayData
          ? renderAnimatedSection(
              'today',
              <TodayMetrics today={overview.todayData} metrics={overview.metrics} />,
              {
                eager: true,
              },
            )
          : null
      case 'currentMonth':
        return sectionVisibility.currentMonth && overview.hasCurrentMonthData
          ? renderAnimatedSection(
              'currentMonth',
              <MonthMetrics daily={overview.filteredDailyData} metrics={overview.metrics} />,
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
                    overview.viewMode === 'daily'
                      ? t('dashboard.activity.dailyDescription')
                      : overview.viewMode === 'monthly'
                        ? t('dashboard.activity.monthlyDescription')
                        : t('dashboard.activity.yearlyDescription')
                  }
                  info={SECTION_HELP.activity}
                />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <HeatmapCalendar
                    data={overview.filteredData}
                    viewMode={overview.viewMode}
                    metric="cost"
                    isDark={overview.isDark}
                  />
                  <HeatmapCalendar
                    data={overview.filteredData}
                    viewMode={overview.viewMode}
                    metric="requests"
                    isDark={overview.isDark}
                  />
                  <HeatmapCalendar
                    data={overview.filteredData}
                    viewMode={overview.viewMode}
                    metric="tokens"
                    isDark={overview.isDark}
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
                    <CostForecast
                      data={forecast.filteredData}
                      forecast={forecast.forecastState.costForecast}
                      viewMode={forecast.viewMode}
                      onExpand={() => setForecastZoomOpen(true)}
                    />,
                    'h-[360px]',
                  )}
                  {renderLazySection(
                    <ExpandableCard
                      title={t('dashboard.cards.cacheRoi')}
                      stats={[
                        {
                          label: t('dashboard.stats.cacheHitRate'),
                          value: formatPercent(forecast.metrics.cacheHitRate),
                        },
                        {
                          label: t('dashboard.stats.totalTokens'),
                          value: formatTokens(forecast.metrics.totalTokens),
                        },
                        {
                          label: t('dashboard.stats.cacheRead'),
                          value: formatTokens(forecast.metrics.totalCacheRead),
                        },
                      ]}
                    >
                      <CacheROI data={forecast.filteredData} viewMode={forecast.viewMode} />
                    </ExpandableCard>,
                    'h-[360px]',
                  )}
                </div>
                <div className="mt-4">
                  {renderLazySection(
                    <ProviderCostForecast
                      forecast={forecast.forecastState.providerForecast}
                      viewMode={forecast.viewMode}
                      onExpand={() => setForecastZoomOpen(true)}
                    />,
                    'h-[430px]',
                  )}
                </div>
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <ForecastZoomDialog
                      open={forecastZoomOpen}
                      onOpenChange={setForecastZoomOpen}
                      data={forecast.filteredData}
                      forecastState={forecast.forecastState}
                      viewMode={forecast.viewMode}
                    />
                  </Suspense>
                </ErrorBoundary>
              </>,
              {
                onPreload: dashboardSectionPreloaders.forecastCache,
              },
            )
          : null
      case 'limits':
        return sectionVisibility.limits
          ? renderAnimatedSection(
              'limits',
              renderLazySection(
                <ProviderLimitsSection
                  data={limits.filteredDailyData}
                  providers={limits.visibleLimitProviders}
                  limits={limits.providerLimits}
                  selectedMonth={limits.selectedMonth}
                />,
                'h-[420px]',
              ),
              {
                onPreload: dashboardSectionPreloaders.limits,
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
                  badge={`${costAnalysis.allModels.length} ${t('common.models')}`}
                  description={t('dashboard.costAnalysis.description')}
                  info={SECTION_HELP.costAnalysis}
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    {renderLazySection(
                      <CostOverTime
                        data={costAnalysis.costChartData}
                        onClickDay={interactions.onDrillDownDateChange}
                      />,
                      'h-[360px]',
                    )}
                  </div>
                  {renderLazySection(<CostByModel data={costAnalysis.modelPieData} />, 'h-[360px]')}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(
                    <CumulativeCostPerProvider
                      data={costAnalysis.filteredData}
                      forecast={costAnalysis.forecastState.providerForecast}
                    />,
                    'h-[320px]',
                  )}
                  {renderLazySection(
                    <CostByModelOverTime
                      data={costAnalysis.modelCostChartData}
                      models={costAnalysis.allModels}
                    />,
                    'h-[320px]',
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(
                    <CumulativeCost
                      data={costAnalysis.costChartData}
                      forecast={costAnalysis.forecastState.costForecast}
                    />,
                    'h-[320px]',
                  )}
                  {renderLazySection(
                    <CostByWeekday data={costAnalysis.weekdayData} />,
                    'h-[320px]',
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {renderLazySection(
                    <TokenEfficiency data={costAnalysis.filteredData} />,
                    'h-[320px]',
                  )}
                  {renderLazySection(<ModelMix data={costAnalysis.filteredData} />, 'h-[320px]')}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.costAnalysis,
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
                    <TokensOverTime
                      data={tokenAnalysis.tokenChartData}
                      onClickDay={interactions.onDrillDownDateChange}
                    />,
                    'h-[320px]',
                  )}
                  {renderLazySection(<TokenTypes data={tokenAnalysis.tokenPieData} />, 'h-[320px]')}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.tokenAnalysis,
              },
            )
          : null
      case 'requestAnalysis':
        return sectionVisibility.requestAnalysis && requestAnalysis.metrics.hasRequestData
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
                    data={requestAnalysis.requestChartData}
                    viewMode={requestAnalysis.viewMode}
                    onClickDay={interactions.onDrillDownDateChange}
                  />,
                  'h-[320px]',
                )}
                <div className="mt-4">
                  {renderLazySection(
                    <RequestCacheHitRateByModel
                      timelineData={requestAnalysis.filteredData}
                      summaryData={requestAnalysis.filteredDailyData}
                      viewMode={requestAnalysis.viewMode}
                    />,
                    'h-[320px]',
                  )}
                </div>
                <div className="mt-4">
                  {renderLazySection(
                    <RequestQuality
                      metrics={requestAnalysis.metrics}
                      viewMode={requestAnalysis.viewMode}
                    />,
                    'h-[280px]',
                  )}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.requestAnalysis,
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
                    <DistributionAnalysis
                      data={advancedAnalysis.filteredData}
                      viewMode={advancedAnalysis.viewMode}
                    />,
                    'h-[320px]',
                  )}
                  <ConcentrationRisk
                    topModelShare={advancedAnalysis.metrics.topModelShare}
                    topProviderShare={advancedAnalysis.metrics.topProvider?.share ?? 0}
                    modelConcentrationIndex={advancedAnalysis.metrics.modelConcentrationIndex}
                    providerConcentrationIndex={advancedAnalysis.metrics.providerConcentrationIndex}
                  />
                </div>
                <div className="mt-4">
                  {renderLazySection(
                    <CorrelationAnalysis data={advancedAnalysis.filteredData} />,
                    'h-[320px]',
                  )}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.advancedAnalysis,
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
                          value: String(comparisons.filteredData.length),
                        },
                        {
                          label: t('dashboard.stats.avgCostPerUnit', {
                            unit: periodUnit(comparisons.viewMode),
                          }),
                          value: formatCurrency(comparisons.metrics.avgDailyCost),
                        },
                      ]}
                    >
                      <PeriodComparison data={comparisons.comparisonData} />
                    </ExpandableCard>,
                    'h-[360px]',
                  )}
                  {renderLazySection(
                    <ExpandableCard
                      title={t('dashboard.cards.anomalyDetection')}
                      stats={[
                        {
                          label: t('dashboard.stats.total'),
                          value: formatCurrency(comparisons.metrics.totalCost),
                        },
                        {
                          label: t('dashboard.stats.avgPerUnit', {
                            unit: periodUnit(comparisons.viewMode),
                          }),
                          value: formatCurrency(comparisons.metrics.avgDailyCost),
                        },
                      ]}
                    >
                      <AnomalyDetection
                        data={comparisons.filteredData}
                        onClickDay={interactions.onDrillDownDateChange}
                        viewMode={comparisons.viewMode}
                      />
                    </ExpandableCard>,
                    'h-[360px]',
                  )}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.comparisons,
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
                    modelCosts={tables.modelCosts}
                    totalCost={tables.metrics.totalCost}
                    viewMode={tables.viewMode}
                  />,
                  'h-[320px]',
                )}
                <div className="mt-4">
                  {renderLazySection(
                    <ProviderEfficiency
                      providerMetrics={tables.providerMetrics}
                      totalCost={tables.metrics.totalCost}
                      viewMode={tables.viewMode}
                    />,
                    'h-[320px]',
                  )}
                </div>
                <div className="mt-4">
                  {renderLazySection(
                    <RecentDays
                      data={tables.filteredData}
                      onClickDay={interactions.onDrillDownDateChange}
                      viewMode={tables.viewMode}
                    />,
                    'h-[360px]',
                  )}
                </div>
              </>,
              {
                onPreload: dashboardSectionPreloaders.tables,
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
