// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { useDashboardControllerWithBootstrap } from '@/hooks/use-dashboard-controller'
import { createTestQueryClient, renderHookWithQueryClient } from '../test-utils'
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
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ addToast: toastMocks.addToast }),
}))
vi.mock('@/lib/api', () => apiMocks)

describe('useDashboardControllerWithBootstrap actions', () => {
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
    filterHookMocks.useDashboardFilters.mockReturnValue(
      createFilterState({
        selectedMonth: '2026-04',
        selectedProviders: ['OpenAI'],
        selectedModels: ['GPT-4o'],
        startDate: '2026-04-01',
        endDate: '2026-04-20',
      }),
    )
    computedHookMocks.useComputedMetrics.mockReturnValue(createComputedState())
    apiMocks.deleteSettings.mockReset()
    apiMocks.generatePdfReport.mockReset()
    apiMocks.importSettings.mockReset()
    apiMocks.importUsageData.mockReset()
    toastMocks.addToast.mockReset()
    delete (window as Window & { __TTDASH_TEST_HOOKS__?: object }).__TTDASH_TEST_HOOKS__
  })

  it('shapes the PDF report request from the current filter state', async () => {
    const clickSpy = vi.fn()
    const objectUrl = 'blob:pdf-report'
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    const client = createTestQueryClient()
    const anchor = document.createElement('a')
    anchor.click = clickSpy
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchor
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    apiMocks.generatePdfReport.mockResolvedValue(blob)

    const { result } = renderHookWithQueryClient(
      () => useDashboardControllerWithBootstrap(createSettings(), true, Date.now(), null),
      { client },
    )

    await result.current.handleGenerateReport()

    expect(apiMocks.generatePdfReport).toHaveBeenCalledWith({
      viewMode: 'daily',
      selectedMonth: '2026-04',
      selectedProviders: ['OpenAI'],
      selectedModels: ['GPT-4o'],
      startDate: '2026-04-01',
      endDate: '2026-04-20',
      language: 'en',
    })
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(toastMocks.addToast).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('exports settings and usage backups through the test hook bridge', async () => {
    const downloads: Array<{ filename: string; text: string }> = []
    ;(
      window as Window & {
        __TTDASH_TEST_HOOKS__?: {
          onJsonDownload: (record: { filename: string; text: string }) => void
        }
      }
    ).__TTDASH_TEST_HOOKS__ = {
      onJsonDownload: (record) => downloads.push(record),
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json-download')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchor = document.createElement('a')
    anchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchor
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    const { result } = renderHookWithQueryClient(() =>
      useDashboardControllerWithBootstrap(createSettings(), true, Date.now(), null),
    )

    result.current.handleExportSettings()
    result.current.handleExportData()

    expect(downloads).toHaveLength(2)
    expect(downloads[0].filename).toMatch(/^ttdash-settings-backup-/)
    expect(downloads[0].text).toContain('"kind": "ttdash-settings-backup"')
    expect(downloads[1].filename).toMatch(/^ttdash-data-backup-/)
    expect(downloads[1].text).toContain('"kind": "ttdash-usage-backup"')
  })

  it('invalidates cached usage after a successful data import', async () => {
    const client = createTestQueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    apiMocks.importUsageData.mockResolvedValue({
      importedDays: 2,
      addedDays: 2,
      unchangedDays: 0,
      conflictingDays: 0,
      totalDays: 2,
    })

    const { result } = renderHookWithQueryClient(
      () => useDashboardControllerWithBootstrap(createSettings(), true, Date.now(), null),
      { client },
    )

    const file = new File(
      [JSON.stringify({ kind: 'ttdash-usage-backup', version: 1, data: { daily: [] } })],
      'backup.json',
      {
        type: 'application/json',
      },
    )

    await result.current.handleDataImportChange({
      target: { files: [file], value: 'backup.json' },
    } as never)

    expect(apiMocks.importUsageData).toHaveBeenCalledTimes(1)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['usage'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings'] })
  })
})
