import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { DashboardSectionId } from '@/types'
import type { DashboardSectionsViewModel } from '@/types/dashboard-view-model'

/** Options passed through to the animated dashboard section shell. */
export interface DashboardSectionRenderOptions {
  eager?: boolean
  onPreload?: () => void | Promise<unknown>
}

/** Shared render context injected into dashboard section family renderers. */
export interface DashboardSectionRenderContext {
  viewModel: DashboardSectionsViewModel
  t: TFunction
  forecastZoomOpen: boolean
  setForecastZoomOpen: Dispatch<SetStateAction<boolean>>
  renderAnimatedSection: (
    sectionId: DashboardSectionId,
    children: ReactNode,
    options?: DashboardSectionRenderOptions,
  ) => ReactNode
  renderLazySection: (content: ReactNode, className?: string) => ReactNode
}

/** Renders one dashboard section from the shared section render context. */
export type DashboardSectionRenderer = (context: DashboardSectionRenderContext) => ReactNode
