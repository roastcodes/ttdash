import type { DashboardSectionId, DashboardSectionOrder, DashboardSectionVisibility } from '@/types'

/** Describes one dashboard section chunk preload task. */
export type DashboardSectionPreloadTask = () => void | Promise<unknown>
/** Maps dashboard sections to the lazy chunks needed before the section reveals. */
export type DashboardSectionPreloaders = Partial<
  Record<DashboardSectionId, DashboardSectionPreloadTask>
>

interface DashboardSectionPreloadQueueInput {
  sectionOrder: DashboardSectionOrder
  sectionVisibility: DashboardSectionVisibility
  preloaders: DashboardSectionPreloaders
  requestAnalysisEnabled: boolean
}

/** Resolves the visible lazy section preload queue in the user's configured section order. */
export function resolveDashboardSectionPreloadTasks({
  sectionOrder,
  sectionVisibility,
  preloaders,
  requestAnalysisEnabled,
}: DashboardSectionPreloadQueueInput) {
  const queuedTasks = new Set<DashboardSectionPreloadTask>()

  return sectionOrder.flatMap((sectionId) => {
    if (!sectionVisibility[sectionId]) return []
    if (sectionId === 'requestAnalysis' && !requestAnalysisEnabled) return []

    const preloadTask = preloaders[sectionId]
    if (!preloadTask || queuedTasks.has(preloadTask)) return []

    queuedTasks.add(preloadTask)
    return [preloadTask]
  })
}
