import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { DashboardSectionPreloaders } from '../dashboard-section-preloading'

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

async function preloadComponents<const T extends readonly unknown[]>(
  ...components: { readonly [K in keyof T]: { preload: () => Promise<T[K]> } }
): Promise<T> {
  const results = await Promise.allSettled(components.map((component) => component.preload()))
  const rejectedResult = results.find((result): result is PromiseRejectedResult => {
    return result.status === 'rejected'
  })

  if (rejectedResult) {
    throw rejectedResult.reason
  }

  // The rejection guard above ensures results contains only fulfilled preload promises here.
  const fulfilledResults = results as readonly PromiseFulfilledResult<unknown>[]
  return fulfilledResults.map((result) => result.value) as unknown as T
}

const CostForecast = lazyWithPreload(() =>
  import('../../features/forecast/CostForecast').then((module) => ({
    default: module.CostForecast,
  })),
)
const ProviderCostForecast = lazyWithPreload(() =>
  import('../../features/forecast/ProviderCostForecast').then((module) => ({
    default: module.ProviderCostForecast,
  })),
)
const ForecastZoomDialog = lazyWithPreload(() =>
  import('../../features/forecast/ForecastZoomDialog').then((module) => ({
    default: module.ForecastZoomDialog,
  })),
)
const CostOverTime = lazyWithPreload(() =>
  import('../../charts/CostOverTime').then((module) => ({
    default: module.CostOverTime,
  })),
)
const CostByModel = lazyWithPreload(() =>
  import('../../charts/CostByModel').then((module) => ({
    default: module.CostByModel,
  })),
)
const CostByModelOverTime = lazyWithPreload(() =>
  import('../../charts/CostByModelOverTime').then((module) => ({
    default: module.CostByModelOverTime,
  })),
)
const CumulativeCost = lazyWithPreload(() =>
  import('../../charts/CumulativeCost').then((module) => ({
    default: module.CumulativeCost,
  })),
)
const CumulativeCostPerProvider = lazyWithPreload(() =>
  import('../../charts/CumulativeCostPerProvider').then((module) => ({
    default: module.CumulativeCostPerProvider,
  })),
)
const CostByWeekday = lazyWithPreload(() =>
  import('../../charts/CostByWeekday').then((module) => ({
    default: module.CostByWeekday,
  })),
)
const TokenEfficiency = lazyWithPreload(() =>
  import('../../charts/TokenEfficiency').then((module) => ({
    default: module.TokenEfficiency,
  })),
)
const ModelMix = lazyWithPreload(() =>
  import('../../charts/ModelMix').then((module) => ({
    default: module.ModelMix,
  })),
)
const TokensOverTime = lazyWithPreload(() =>
  import('../../charts/TokensOverTime').then((module) => ({
    default: module.TokensOverTime,
  })),
)
const TokenTypes = lazyWithPreload(() =>
  import('../../charts/TokenTypes').then((module) => ({
    default: module.TokenTypes,
  })),
)
const RequestsOverTime = lazyWithPreload(() =>
  import('../../charts/RequestsOverTime').then((module) => ({
    default: module.RequestsOverTime,
  })),
)
const RequestCacheHitRateByModel = lazyWithPreload(() =>
  import('../../charts/RequestCacheHitRateByModel').then((module) => ({
    default: module.RequestCacheHitRateByModel,
  })),
)
const CacheROI = lazyWithPreload(() =>
  import('../../features/cache-roi/CacheROI').then((module) => ({
    default: module.CacheROI,
  })),
)
const ProviderLimitsSection = lazyWithPreload(() =>
  import('../../features/limits/ProviderLimitsSection').then((module) => ({
    default: module.ProviderLimitsSection,
  })),
)
const RequestQuality = lazyWithPreload(() =>
  import('../../features/request-quality/RequestQuality').then((module) => ({
    default: module.RequestQuality,
  })),
)
const DistributionAnalysis = lazyWithPreload(() =>
  import('../../charts/DistributionAnalysis').then((module) => ({
    default: module.DistributionAnalysis,
  })),
)
const CorrelationAnalysis = lazyWithPreload(() =>
  import('../../charts/CorrelationAnalysis').then((module) => ({
    default: module.CorrelationAnalysis,
  })),
)
const PeriodComparison = lazyWithPreload(() =>
  import('../../features/comparison/PeriodComparison').then((module) => ({
    default: module.PeriodComparison,
  })),
)
const AnomalyDetection = lazyWithPreload(() =>
  import('../../features/anomaly/AnomalyDetection').then((module) => ({
    default: module.AnomalyDetection,
  })),
)
const ModelEfficiency = lazyWithPreload(() =>
  import('../../tables/ModelEfficiency').then((module) => ({
    default: module.ModelEfficiency,
  })),
)
const ProviderEfficiency = lazyWithPreload(() =>
  import('../../tables/ProviderEfficiency').then((module) => ({
    default: module.ProviderEfficiency,
  })),
)
const RecentDays = lazyWithPreload(() =>
  import('../../tables/RecentDays').then((module) => ({
    default: module.RecentDays,
  })),
)

/** Lazy dashboard section component registry shared by family renderers and preload plans. */
export const dashboardLazySectionComponents = {
  CostForecast,
  ProviderCostForecast,
  ForecastZoomDialog,
  CostOverTime,
  CostByModel,
  CostByModelOverTime,
  CumulativeCost,
  CumulativeCostPerProvider,
  CostByWeekday,
  TokenEfficiency,
  ModelMix,
  TokensOverTime,
  TokenTypes,
  RequestsOverTime,
  RequestCacheHitRateByModel,
  CacheROI,
  ProviderLimitsSection,
  RequestQuality,
  DistributionAnalysis,
  CorrelationAnalysis,
  PeriodComparison,
  AnomalyDetection,
  ModelEfficiency,
  ProviderEfficiency,
  RecentDays,
}

/** Preload groups aligned with the dashboard section families. */
export const dashboardSectionPreloaders = {
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
