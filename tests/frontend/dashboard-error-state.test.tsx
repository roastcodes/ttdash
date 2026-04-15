// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from '@/components/Dashboard'
import { ToastProvider } from '@/components/ui/toast'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'

const usageHookMocks = vi.hoisted(() => ({
  useUsageData: vi.fn(),
  useUploadData: vi.fn(),
  useDeleteData: vi.fn(),
}))

const settingsHookMocks = vi.hoisted(() => ({
  useAppSettings: vi.fn(),
}))

const apiMocks = vi.hoisted(() => ({
  deleteSettings: vi.fn(),
  generatePdfReport: vi.fn(),
  importSettings: vi.fn(),
  importUsageData: vi.fn(),
}))

vi.mock('@/hooks/use-usage-data', () => usageHookMocks)
vi.mock('@/hooks/use-app-settings', () => settingsHookMocks)
vi.mock('@/lib/api', () => apiMocks)

function makeEmptyUsageData() {
  return {
    daily: [],
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      totalTokens: 0,
      requestCount: 0,
    },
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
}

describe('Dashboard fatal load state', () => {
  beforeEach(async () => {
    await initI18n('en')
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )

    usageHookMocks.useUploadData.mockReturnValue({
      mutateAsync: vi.fn(),
    })
    usageHookMocks.useDeleteData.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
    settingsHookMocks.useAppSettings.mockReturnValue({
      settings: {
        ...DEFAULT_APP_SETTINGS,
        language: 'en',
      },
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
    apiMocks.deleteSettings.mockResolvedValue(DEFAULT_APP_SETTINGS)
    apiMocks.generatePdfReport.mockResolvedValue(new Blob())
    apiMocks.importSettings.mockResolvedValue(DEFAULT_APP_SETTINGS)
    apiMocks.importUsageData.mockResolvedValue({
      importedDays: 0,
      addedDays: 0,
      unchangedDays: 0,
      conflictingDays: 0,
      totalDays: 0,
    })
  })

  it('renders a fatal settings error state instead of the normal empty state and resets settings', async () => {
    usageHookMocks.useUsageData.mockReturnValue({
      data: makeEmptyUsageData(),
      isLoading: false,
      error: null,
    })

    render(<Dashboard initialSettingsError="Settings file is unreadable or corrupted." />, {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByRole('heading', { name: 'Could not load local app state' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The local settings file is unreadable or corrupted.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload file' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }))

    await waitFor(() => expect(apiMocks.deleteSettings).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Settings reset')).toBeInTheDocument()
  })

  it('renders a fatal usage error state with a delete action for corrupted stored data', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)

    usageHookMocks.useUsageData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Usage data file is unreadable or corrupted.'),
    })
    usageHookMocks.useDeleteData.mockReturnValue({
      mutateAsync,
    })

    render(<Dashboard />, {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByText('The local usage data file is unreadable or corrupted.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete stored data' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Settings & backups' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete stored data' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
  })

  it('shows the backend upload error instead of masking it as a file-read failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Usage payload is invalid'))

    usageHookMocks.useUsageData.mockReturnValue({
      data: makeEmptyUsageData(),
      isLoading: false,
      error: null,
    })
    usageHookMocks.useUploadData.mockReturnValue({
      mutateAsync,
    })

    render(<Dashboard />, {
      wrapper: createWrapper(),
    })

    const input = screen.getByTestId('usage-upload-input') as HTMLInputElement
    const file = new File([JSON.stringify({ daily: [] })], 'usage.json', {
      type: 'application/json',
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Usage payload is invalid')).toBeInTheDocument()
    expect(screen.queryByText('Could not read file')).not.toBeInTheDocument()
  })

  it('keeps the file-read toast for malformed JSON uploads', async () => {
    const mutateAsync = vi.fn()

    usageHookMocks.useUsageData.mockReturnValue({
      data: makeEmptyUsageData(),
      isLoading: false,
      error: null,
    })
    usageHookMocks.useUploadData.mockReturnValue({
      mutateAsync,
    })

    render(<Dashboard />, {
      wrapper: createWrapper(),
    })

    const input = screen.getByTestId('usage-upload-input') as HTMLInputElement
    const file = new File(['{"daily":'], 'broken.json', {
      type: 'application/json',
    })

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Could not read file')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('shows a failure toast when deleting corrupted stored data fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Delete request failed'))

    usageHookMocks.useUsageData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Usage data file is unreadable or corrupted.'),
    })
    usageHookMocks.useDeleteData.mockReturnValue({
      mutateAsync,
    })

    render(<Dashboard />, {
      wrapper: createWrapper(),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete stored data' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Delete request failed')).toBeInTheDocument()
  })
})
