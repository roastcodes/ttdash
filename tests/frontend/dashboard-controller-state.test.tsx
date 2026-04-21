// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { initI18n } from '@/lib/i18n'
import { useDashboardControllerWithBootstrap } from '@/hooks/use-dashboard-controller'
import { renderHookWithQueryClient } from '../test-utils'
import {
  createComputedState,
  createFilterState,
  createSettings,
  createUsageData,
} from './dashboard-controller-test-helpers'

const usageHookMocks = vi.hoisted(() => ({
  useUsageData: vi.fn(),
  useUploadData: vi.fn(),
  useDeleteData: vi.fn(),
}))

const settingsHookMocks = vi.hoisted(() => ({
  useAppSettings: vi.fn(),
}))

const filterHookMocks = vi.hoisted(() => ({
  useDashboardFilters: vi.fn(),
}))

const computedHookMocks = vi.hoisted(() => ({
  useComputedMetrics: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  addToast: vi.fn(),
}))

const apiMocks = vi.hoisted(() => ({
  deleteSettings: vi.fn(),
  generatePdfReport: vi.fn(),
  importSettings: vi.fn(),
  importUsageData: vi.fn(),
}))

vi.mock('@/hooks/use-usage-data', () => usageHookMocks)
vi.mock('@/hooks/use-app-settings', () => settingsHookMocks)
vi.mock('@/hooks/use-dashboard-filters', () => filterHookMocks)
vi.mock('@/hooks/use-computed-metrics', () => computedHookMocks)
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: toastMocks.addToast }),
}))
vi.mock('@/lib/api', () => apiMocks)

describe('useDashboardControllerWithBootstrap state', () => {
  beforeEach(async () => {
    await initI18n('en')

    usageHookMocks.useUsageData.mockReturnValue({
      data: createUsageData({
        daily: [
          {
            date: '2026-04-20',
            inputTokens: 1,
            outputTokens: 2,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            totalTokens: 3,
            totalCost: 1.25,
            requestCount: 1,
            modelsUsed: ['GPT-4o'],
            modelBreakdowns: [],
          },
        ],
      }),
      isLoading: false,
      error: null,
    })
    usageHookMocks.useUploadData.mockReturnValue({ mutateAsync: vi.fn() })
    usageHookMocks.useDeleteData.mockReturnValue({ mutateAsync: vi.fn() })
    settingsHookMocks.useAppSettings.mockReturnValue({
      settings: createSettings(),
      providerLimits: {},
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      saveSettings: vi.fn(),
      isSaving: false,
      isLoading: false,
      error: null,
      isError: false,
      hasFetchedAfterMount: false,
    })
    filterHookMocks.useDashboardFilters.mockReturnValue(createFilterState())
    computedHookMocks.useComputedMetrics.mockReturnValue(createComputedState())
    apiMocks.deleteSettings.mockReset()
    apiMocks.generatePdfReport.mockReset()
    apiMocks.importSettings.mockReset()
    apiMocks.importUsageData.mockReset()
    toastMocks.addToast.mockReset()
    delete (window as Window & { __TTDASH_TEST_HOOKS__?: object }).__TTDASH_TEST_HOOKS__
  })

  it('builds the startup auto-load badge from persisted CLI auto-load settings', async () => {
    settingsHookMocks.useAppSettings.mockReturnValue({
      settings: createSettings({
        cliAutoLoadActive: true,
        lastLoadedAt: '2026-04-20T10:15:00.000Z',
        lastLoadSource: 'cli-auto-load',
      }),
      providerLimits: {},
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      saveSettings: vi.fn(),
      isSaving: false,
      isLoading: false,
      error: null,
      isError: false,
      hasFetchedAfterMount: false,
    })

    const { result } = renderHookWithQueryClient(() =>
      useDashboardControllerWithBootstrap(createSettings(), true, Date.now(), null),
    )

    await waitFor(() =>
      expect(result.current.startupAutoLoadBadge).toMatchObject({
        active: true,
        time: expect.any(String),
        title: expect.stringContaining('Automatically loaded on start'),
      }),
    )
  })

  it('normalizes corrupted usage errors into the localized fatal-load fallback', async () => {
    usageHookMocks.useUsageData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Usage data file is unreadable or corrupted.'),
    })

    const { result } = renderHookWithQueryClient(() =>
      useDashboardControllerWithBootstrap(createSettings(), false, null, null),
    )

    await waitFor(() =>
      expect(result.current.fatalLoadState).toMatchObject({
        title: 'Could not load local app state',
        details: ['The local usage data file is unreadable or corrupted.'],
        canResetUsage: true,
        canResetSettings: false,
      }),
    )
  })

  it('clears a bootstrap settings error after a successful settings reset', async () => {
    apiMocks.deleteSettings.mockResolvedValue(createSettings({ theme: 'light' }))

    const { result } = renderHookWithQueryClient(() =>
      useDashboardControllerWithBootstrap(
        createSettings(),
        false,
        null,
        'Settings file is unreadable or corrupted.',
      ),
    )

    expect(result.current.fatalLoadState?.canResetSettings).toBe(true)

    await result.current.handleResetSettings()

    await waitFor(() => expect(result.current.fatalLoadState).toBeNull())
    expect(toastMocks.addToast).toHaveBeenCalledWith('Settings reset', 'success')
  })
})
