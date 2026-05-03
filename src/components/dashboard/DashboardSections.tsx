import { Fragment, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartCardSkeleton } from '../ui/skeleton'
import { ErrorBoundary } from '../ui/error-boundary'
import { AnimatedDashboardSection, scheduleDashboardPreloads } from './DashboardMotion'
import { resolveDashboardSectionPreloadTasks } from './dashboard-section-preloading'
import { dashboardSectionPreloaders } from './sections/dashboard-section-lazy-components'
import {
  dashboardSectionAnchorMap,
  dashboardSectionPlaceholderClassName,
} from './sections/dashboard-section-metadata'
import { renderDashboardSection } from './sections/dashboard-section-renderers'
import { cn } from '@/lib/cn'
import type { DashboardSectionsViewModel } from '@/types/dashboard-view-model'
import type { DashboardSectionId } from '@/types'

interface DashboardSectionsProps {
  viewModel: DashboardSectionsViewModel
}

/** Renders the ordered dashboard sections for the active filters and settings. */
export function DashboardSections({ viewModel }: DashboardSectionsProps) {
  const { t } = useTranslation()
  const [forecastZoomOpen, setForecastZoomOpen] = useState(false)
  const { layout, requestAnalysis } = viewModel
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

  const renderAnimatedSection = (
    sectionId: DashboardSectionId,
    children: ReactNode,
    {
      eager = false,
      onPreload,
    }: { eager?: boolean; onPreload?: () => void | Promise<unknown> } = {},
  ) => {
    const sectionAnchorId = dashboardSectionAnchorMap[sectionId] ?? sectionId

    return (
      <AnimatedDashboardSection
        id={sectionAnchorId}
        eager={eager}
        placeholderClassName={dashboardSectionPlaceholderClassName[sectionId]}
        onPreload={onPreload}
      >
        {children}
      </AnimatedDashboardSection>
    )
  }

  const renderSection = (sectionId: DashboardSectionId) =>
    renderDashboardSection(sectionId, {
      viewModel,
      t,
      forecastZoomOpen,
      setForecastZoomOpen,
      renderAnimatedSection,
      renderLazySection,
    })

  return (
    <>
      {sectionOrder.map((sectionId) => (
        <Fragment key={sectionId}>{renderSection(sectionId)}</Fragment>
      ))}
    </>
  )
}
