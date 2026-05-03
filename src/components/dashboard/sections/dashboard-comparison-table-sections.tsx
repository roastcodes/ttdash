import { ExpandableCard } from '../../ui/expandable-card'
import { SectionHeader } from '../../ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import { formatCurrency, periodUnit } from '@/lib/formatters'
import type { DashboardSectionId } from '@/types'
import {
  dashboardLazySectionComponents,
  dashboardSectionPreloaders,
} from './dashboard-section-lazy-components'
import type { DashboardSectionRenderer } from './dashboard-section-renderer-types'

const { AnomalyDetection, ModelEfficiency, PeriodComparison, ProviderEfficiency, RecentDays } =
  dashboardLazySectionComponents

/** Renderers for comparison and table dashboard sections. */
export const comparisonTableSectionRenderers = {
  comparisons: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { comparisons, interactions, layout } = viewModel

    return layout.sectionVisibility.comparisons
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
  },
  tables: ({ viewModel, t, renderAnimatedSection, renderLazySection }) => {
    const { tables, interactions, layout } = viewModel

    return layout.sectionVisibility.tables
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
  },
} satisfies Partial<Record<DashboardSectionId, DashboardSectionRenderer>>
