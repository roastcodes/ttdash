import type { DashboardSectionId } from '@/types'
import { analysisSectionRenderers } from './dashboard-analysis-sections'
import { comparisonTableSectionRenderers } from './dashboard-comparison-table-sections'
import { forecastSectionRenderers } from './dashboard-forecast-sections'
import { overviewSectionRenderers } from './dashboard-overview-sections'
import type {
  DashboardSectionRenderContext,
  DashboardSectionRenderer,
} from './dashboard-section-renderer-types'

/** Complete dashboard section renderer registry assembled from section family owners. */
export const dashboardSectionRenderers = {
  ...overviewSectionRenderers,
  ...forecastSectionRenderers,
  ...analysisSectionRenderers,
  ...comparisonTableSectionRenderers,
} satisfies Record<DashboardSectionId, DashboardSectionRenderer>

/** Renders a dashboard section through the family-owned renderer registry. */
export function renderDashboardSection(
  sectionId: DashboardSectionId,
  context: DashboardSectionRenderContext,
) {
  return dashboardSectionRenderers[sectionId](context)
}
