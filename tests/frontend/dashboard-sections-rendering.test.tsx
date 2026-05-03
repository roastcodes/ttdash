// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardSections } from '@/components/dashboard/DashboardSections'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import type { DashboardSectionId } from '@/types'
import { createDashboardSectionsViewModel } from './dashboard-controller-test-helpers'
import { renderWithAppProviders } from '../test-utils'

const dashboardMotionMocks = vi.hoisted(() => ({
  cancelPreloads: vi.fn(),
  scheduleDashboardPreloads: vi.fn(),
}))

dashboardMotionMocks.scheduleDashboardPreloads.mockImplementation(() => ({
  cancel: dashboardMotionMocks.cancelPreloads,
}))

vi.mock('@/components/dashboard/DashboardMotion', () => ({
  AnimatedDashboardSection: ({
    children,
    eager,
    id,
    onPreload,
    placeholderClassName,
  }: {
    children: ReactNode
    eager?: boolean
    id: string
    onPreload?: () => void | Promise<unknown>
    placeholderClassName?: string
  }) => (
    <section
      data-eager={String(Boolean(eager))}
      data-placeholder={placeholderClassName}
      data-preload={String(typeof onPreload === 'function')}
      data-testid={`section-${id}`}
      id={id}
    >
      {children}
    </section>
  ),
  scheduleDashboardPreloads: dashboardMotionMocks.scheduleDashboardPreloads,
}))

vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  ChartCardSkeleton: ({ className }: { className?: string }) => (
    <div data-class={className} data-testid="lazy-card-fallback" />
  ),
}))

vi.mock('@/components/ui/section-header', () => ({
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

vi.mock('@/components/ui/expandable-card', () => ({
  ExpandableCard: ({ children, title }: { children: ReactNode; title: string }) => (
    <div data-testid={`expandable-${title}`}>{children}</div>
  ),
}))

vi.mock('@/components/cards/PrimaryMetrics', () => ({
  PrimaryMetrics: () => <div data-testid="primary-metrics" />,
}))
vi.mock('@/components/cards/SecondaryMetrics', () => ({
  SecondaryMetrics: () => <div data-testid="secondary-metrics" />,
}))
vi.mock('@/components/cards/TodayMetrics', () => ({
  TodayMetrics: () => <div data-testid="today-metrics" />,
}))
vi.mock('@/components/cards/MonthMetrics', () => ({
  MonthMetrics: () => <div data-testid="month-metrics" />,
}))
vi.mock('@/components/features/heatmap/HeatmapCalendar', () => ({
  HeatmapCalendar: ({ metric }: { metric: string }) => <div data-testid={`heatmap-${metric}`} />,
}))
vi.mock('@/components/features/insights/UsageInsights', () => ({
  UsageInsights: () => <div data-testid="usage-insights" />,
}))
vi.mock('@/components/features/risk/ConcentrationRisk', () => ({
  ConcentrationRisk: () => <div data-testid="concentration-risk" />,
}))

vi.mock('@/components/features/forecast/CostForecast', () => ({
  CostForecast: ({ onExpand }: { onExpand: () => void }) => (
    <button data-testid="cost-forecast-expand" type="button" onClick={onExpand}>
      expand cost forecast
    </button>
  ),
}))
vi.mock('@/components/features/forecast/ProviderCostForecast', () => ({
  ProviderCostForecast: ({ onExpand }: { onExpand: () => void }) => (
    <button data-testid="provider-forecast-expand" type="button" onClick={onExpand}>
      expand provider forecast
    </button>
  ),
}))
vi.mock('@/components/features/forecast/ForecastZoomDialog', () => ({
  ForecastZoomDialog: ({ open }: { open: boolean }) => (
    <div data-testid="forecast-dialog-open">{String(open)}</div>
  ),
}))
vi.mock('@/components/features/cache-roi/CacheROI', () => ({
  CacheROI: () => <div data-testid="cache-roi" />,
}))
vi.mock('@/components/features/limits/ProviderLimitsSection', () => ({
  ProviderLimitsSection: () => <div data-testid="provider-limits" />,
}))
vi.mock('@/components/features/request-quality/RequestQuality', () => ({
  RequestQuality: () => <div data-testid="request-quality" />,
}))
vi.mock('@/components/features/comparison/PeriodComparison', () => ({
  PeriodComparison: () => <div data-testid="period-comparison" />,
}))
vi.mock('@/components/features/anomaly/AnomalyDetection', () => ({
  AnomalyDetection: () => <div data-testid="anomaly-detection" />,
}))

vi.mock('@/components/charts/CostOverTime', () => ({
  CostOverTime: () => <div data-testid="cost-over-time" />,
}))
vi.mock('@/components/charts/CostByModel', () => ({
  CostByModel: () => <div data-testid="cost-by-model" />,
}))
vi.mock('@/components/charts/CostByModelOverTime', () => ({
  CostByModelOverTime: () => <div data-testid="cost-by-model-over-time" />,
}))
vi.mock('@/components/charts/CumulativeCost', () => ({
  CumulativeCost: () => <div data-testid="cumulative-cost" />,
}))
vi.mock('@/components/charts/CumulativeCostPerProvider', () => ({
  CumulativeCostPerProvider: () => <div data-testid="cumulative-cost-provider" />,
}))
vi.mock('@/components/charts/CostByWeekday', () => ({
  CostByWeekday: () => <div data-testid="cost-by-weekday" />,
}))
vi.mock('@/components/charts/TokenEfficiency', () => ({
  TokenEfficiency: () => <div data-testid="token-efficiency" />,
}))
vi.mock('@/components/charts/ModelMix', () => ({
  ModelMix: () => <div data-testid="model-mix" />,
}))
vi.mock('@/components/charts/TokensOverTime', () => ({
  TokensOverTime: () => <div data-testid="tokens-over-time" />,
}))
vi.mock('@/components/charts/TokenTypes', () => ({
  TokenTypes: () => <div data-testid="token-types" />,
}))
vi.mock('@/components/charts/RequestsOverTime', () => ({
  RequestsOverTime: () => <div data-testid="requests-over-time" />,
}))
vi.mock('@/components/charts/RequestCacheHitRateByModel', () => ({
  RequestCacheHitRateByModel: () => <div data-testid="request-cache-hit-rate" />,
}))
vi.mock('@/components/charts/DistributionAnalysis', () => ({
  DistributionAnalysis: () => <div data-testid="distribution-analysis" />,
}))
vi.mock('@/components/charts/CorrelationAnalysis', () => ({
  CorrelationAnalysis: () => <div data-testid="correlation-analysis" />,
}))

vi.mock('@/components/tables/ModelEfficiency', () => ({
  ModelEfficiency: () => <div data-testid="model-efficiency" />,
}))
vi.mock('@/components/tables/ProviderEfficiency', () => ({
  ProviderEfficiency: () => <div data-testid="provider-efficiency" />,
}))
vi.mock('@/components/tables/RecentDays', () => ({
  RecentDays: () => <div data-testid="recent-days" />,
}))

function createVisibility(overrides: Partial<Record<DashboardSectionId, boolean>> = {}) {
  return {
    ...DEFAULT_APP_SETTINGS.sectionVisibility,
    ...overrides,
  }
}

describe('DashboardSections rendering contracts', () => {
  beforeEach(async () => {
    await initI18n('en')
    dashboardMotionMocks.cancelPreloads.mockClear()
    dashboardMotionMocks.scheduleDashboardPreloads.mockClear()
  })

  it('renders configured sections in order and skips sections without required data', () => {
    const viewModel = createDashboardSectionsViewModel({
      layout: {
        sectionOrder: [
          'metrics',
          'today',
          'currentMonth',
          'requestAnalysis',
          'costAnalysis',
          'tokenAnalysis',
        ],
        sectionVisibility: createVisibility(),
      },
      overview: {
        hasCurrentMonthData: false,
        todayData: null,
      },
      requestAnalysis: {
        metrics: {
          ...createDashboardSectionsViewModel().requestAnalysis.metrics,
          hasRequestData: false,
        },
      },
    })

    renderWithAppProviders(<DashboardSections viewModel={viewModel} />)

    expect(screen.getByTestId('section-metrics')).toHaveAttribute('data-eager', 'true')
    expect(screen.queryByTestId('section-today')).not.toBeInTheDocument()
    expect(screen.queryByTestId('section-current-month')).not.toBeInTheDocument()
    expect(screen.queryByTestId('section-request-analysis')).not.toBeInTheDocument()
    expect(Array.from(document.querySelectorAll('section')).map((section) => section.id)).toEqual([
      'metrics',
      'charts',
      'token-analysis',
    ])
  })

  it('schedules warmup preloads for visible lazy sections and cancels them on unmount', () => {
    const viewModel = createDashboardSectionsViewModel({
      layout: {
        sectionOrder: ['forecastCache', 'requestAnalysis', 'limits'],
        sectionVisibility: createVisibility(),
      },
      requestAnalysis: {
        metrics: {
          ...createDashboardSectionsViewModel().requestAnalysis.metrics,
          hasRequestData: false,
        },
      },
    })

    const { unmount } = renderWithAppProviders(<DashboardSections viewModel={viewModel} />)

    expect(dashboardMotionMocks.scheduleDashboardPreloads).toHaveBeenCalledTimes(1)
    expect(dashboardMotionMocks.scheduleDashboardPreloads.mock.calls[0]?.[0]).toHaveLength(2)
    expect(screen.getByTestId('section-forecast-cache')).toHaveAttribute('data-preload', 'true')
    expect(screen.getByTestId('section-limits')).toHaveAttribute('data-preload', 'true')

    unmount()

    expect(dashboardMotionMocks.cancelPreloads).toHaveBeenCalledTimes(1)
  })

  it('keeps the activity heatmap section viewport lazy while overview metrics render eagerly', () => {
    const viewModel = createDashboardSectionsViewModel({
      layout: {
        sectionOrder: ['metrics', 'activity'],
        sectionVisibility: createVisibility(),
      },
    })

    renderWithAppProviders(<DashboardSections viewModel={viewModel} />)

    expect(screen.getByTestId('section-metrics')).toHaveAttribute('data-eager', 'true')
    expect(screen.getByTestId('section-activity')).toHaveAttribute('data-eager', 'false')
  })

  it('opens the forecast zoom dialog from lazy forecast cards', async () => {
    const viewModel = createDashboardSectionsViewModel({
      layout: {
        sectionOrder: ['forecastCache'],
        sectionVisibility: createVisibility(),
      },
    })

    renderWithAppProviders(<DashboardSections viewModel={viewModel} />)

    // Forecast cards cross a React.lazy boundary in DashboardSections, even with mocked chunks.
    await screen.findByTestId('cost-forecast-expand')
    expect(screen.getByTestId('forecast-dialog-open')).toHaveTextContent('false')

    fireEvent.click(screen.getByTestId('cost-forecast-expand'))

    expect(screen.getByTestId('forecast-dialog-open')).toHaveTextContent('true')
  })
})
