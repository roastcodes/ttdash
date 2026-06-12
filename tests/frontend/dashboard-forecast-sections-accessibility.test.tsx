// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { forecastSectionRenderers } from '@/components/dashboard/sections/dashboard-forecast-sections'
import type { DashboardSectionRenderContext } from '@/components/dashboard/sections/dashboard-section-renderer-types'
import { createDashboardSectionsViewModel } from './dashboard-controller-test-helpers'
import { renderWithAppProviders } from '../test-utils'

const suspendedDialogPromise = vi.hoisted(() => new Promise(() => {}))

vi.mock('@/components/dashboard/sections/dashboard-section-lazy-components', () => ({
  dashboardSectionPreloaders: {
    forecastCache: vi.fn(),
  },
  dashboardLazySectionComponents: {
    CacheROI: () => <div data-testid="cache-roi" />,
    CostForecast: () => <div data-testid="cost-forecast" />,
    ForecastZoomDialog: () => {
      throw suspendedDialogPromise
    },
    ProviderCostForecast: () => <div data-testid="provider-cost-forecast" />,
    ProviderLimitsSection: () => <div data-testid="provider-limits" />,
  },
}))

vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/expandable-card', () => ({
  ExpandableCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/section-header', () => ({
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

describe('forecast section accessibility', () => {
  it('announces the forecast zoom loading fallback', () => {
    const defaultViewModel = createDashboardSectionsViewModel()
    const viewModel = createDashboardSectionsViewModel({
      layout: {
        sectionOrder: ['forecastCache'],
        sectionVisibility: {
          ...defaultViewModel.layout.sectionVisibility,
          forecastCache: true,
        },
      },
    })
    const t = ((key: string) =>
      key === 'dashboard.forecastCache.loadingForecast'
        ? 'Loading forecast'
        : key) as DashboardSectionRenderContext['t']

    const node = forecastSectionRenderers.forecastCache({
      viewModel,
      t,
      forecastZoomOpen: true,
      setForecastZoomOpen: vi.fn() as DashboardSectionRenderContext['setForecastZoomOpen'],
      renderAnimatedSection: (_sectionId, children) => <>{children}</>,
      renderLazySection: (content) => content,
    })

    renderWithAppProviders(<>{node}</>)

    expect(screen.getByRole('status', { name: 'Loading forecast' })).toBeInTheDocument()
  })
})
