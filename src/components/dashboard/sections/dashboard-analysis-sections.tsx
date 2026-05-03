import { ConcentrationRisk } from '../../features/risk/ConcentrationRisk'
import { SectionHeader } from '../../ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import type { DashboardSectionId } from '@/types'
import {
  dashboardLazySectionComponents,
  dashboardSectionPreloaders,
} from './dashboard-section-lazy-components'
import type { DashboardSectionRenderer } from './dashboard-section-renderer-types'

const {
  CorrelationAnalysis,
  CostByModel,
  CostByModelOverTime,
  CostByWeekday,
  CostOverTime,
  CumulativeCost,
  CumulativeCostPerProvider,
  DistributionAnalysis,
  ModelMix,
  RequestCacheHitRateByModel,
  RequestQuality,
  RequestsOverTime,
  TokenEfficiency,
  TokenTypes,
  TokensOverTime,
} = dashboardLazySectionComponents

/** Renderers for chart-heavy dashboard analysis sections. */
export const analysisSectionRenderers = {
  costAnalysis: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { costAnalysis, interactions, layout } = viewModel

    return layout.sectionVisibility.costAnalysis
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
              {renderLazySection(<CostByWeekday data={costAnalysis.weekdayData} />, 'h-[320px]')}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderLazySection(<TokenEfficiency data={costAnalysis.filteredData} />, 'h-[320px]')}
              {renderLazySection(<ModelMix data={costAnalysis.filteredData} />, 'h-[320px]')}
            </div>
          </>,
          {
            onPreload: dashboardSectionPreloaders.costAnalysis,
          },
        )
      : null
  },
  tokenAnalysis: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { tokenAnalysis, interactions, layout } = viewModel

    return layout.sectionVisibility.tokenAnalysis
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
  },
  requestAnalysis: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { requestAnalysis, interactions, layout } = viewModel

    return layout.sectionVisibility.requestAnalysis && requestAnalysis.metrics.hasRequestData
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
  },
  advancedAnalysis: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { advancedAnalysis, layout } = viewModel

    return layout.sectionVisibility.advancedAnalysis
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
              {/* Keep this card eager to preserve the existing advanced-analysis first paint. */}
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
  },
} satisfies Partial<Record<DashboardSectionId, DashboardSectionRenderer>>
