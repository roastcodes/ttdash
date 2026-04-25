import { describe, expect, it, vi } from 'vitest'
import { resolveDashboardSectionPreloadTasks } from '@/components/dashboard/dashboard-section-preloading'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import type { DashboardSectionPreloaders } from '@/components/dashboard/dashboard-section-preloading'

describe('dashboard section preloading', () => {
  it('queues visible preloadable sections in configured section order', () => {
    const preloaders = {
      forecastCache: vi.fn(),
      costAnalysis: vi.fn(),
      requestAnalysis: vi.fn(),
      tables: vi.fn(),
    } satisfies DashboardSectionPreloaders

    const tasks = resolveDashboardSectionPreloadTasks({
      sectionOrder: ['tables', 'metrics', 'forecastCache', 'requestAnalysis', 'costAnalysis'],
      sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
      preloaders,
      requestAnalysisEnabled: true,
    })

    expect(tasks).toEqual([
      preloaders.tables,
      preloaders.forecastCache,
      preloaders.requestAnalysis,
      preloaders.costAnalysis,
    ])
  })

  it('skips hidden sections and request analysis when request metrics are unavailable', () => {
    const preloaders = {
      forecastCache: vi.fn(),
      costAnalysis: vi.fn(),
      requestAnalysis: vi.fn(),
      tables: vi.fn(),
    } satisfies DashboardSectionPreloaders

    const tasks = resolveDashboardSectionPreloadTasks({
      sectionOrder: ['forecastCache', 'costAnalysis', 'requestAnalysis', 'tables'],
      sectionVisibility: {
        ...DEFAULT_APP_SETTINGS.sectionVisibility,
        costAnalysis: false,
      },
      preloaders,
      requestAnalysisEnabled: false,
    })

    expect(tasks).toEqual([preloaders.forecastCache, preloaders.tables])
  })

  it('deduplicates shared preload tasks so one chunk family is only queued once', () => {
    const sharedPreloadTask = vi.fn()
    const preloaders = {
      forecastCache: sharedPreloadTask,
      costAnalysis: sharedPreloadTask,
      tables: vi.fn(),
    } satisfies DashboardSectionPreloaders

    const tasks = resolveDashboardSectionPreloadTasks({
      sectionOrder: ['forecastCache', 'costAnalysis', 'tables'],
      sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
      preloaders,
      requestAnalysisEnabled: true,
    })

    expect(tasks).toEqual([sharedPreloadTask, preloaders.tables])
  })
})
