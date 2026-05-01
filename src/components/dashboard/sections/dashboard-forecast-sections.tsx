import { Suspense } from 'react'
import { ExpandableCard } from '../../ui/expandable-card'
import { ErrorBoundary } from '../../ui/error-boundary'
import { SectionHeader } from '../../ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import { formatPercent, formatTokens } from '@/lib/formatters'
import type { DashboardSectionId } from '@/types'
import {
  dashboardLazySectionComponents,
  dashboardSectionPreloaders,
} from './dashboard-section-lazy-components'
import type { DashboardSectionRenderer } from './dashboard-section-renderer-types'

const { CacheROI, CostForecast, ForecastZoomDialog, ProviderCostForecast, ProviderLimitsSection } =
  dashboardLazySectionComponents

/** Renderers for forecast, cache, and limit dashboard sections. */
export const forecastSectionRenderers = {
  forecastCache: ({
    viewModel,
    t,
    forecastZoomOpen,
    setForecastZoomOpen,
    renderAnimatedSection,
    renderLazySection,
  }) => {
    const { forecast, layout } = viewModel

    return layout.sectionVisibility.forecastCache
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
  },
  limits: ({ viewModel, renderAnimatedSection, renderLazySection }) => {
    const { limits, layout } = viewModel

    return layout.sectionVisibility.limits
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
  },
} satisfies Partial<Record<DashboardSectionId, DashboardSectionRenderer>>
