// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useAppSettings } from '@/hooks/use-app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'

const apiMocks = vi.hoisted(() => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
  fetchUsage: vi.fn(),
  uploadData: vi.fn(),
  deleteUsage: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('react-query hook integrations', () => {
  beforeEach(() => {
    apiMocks.fetchSettings.mockReset()
    apiMocks.updateSettings.mockReset()
    apiMocks.fetchUsage.mockReset()
    apiMocks.uploadData.mockReset()
    apiMocks.deleteUsage.mockReset()
    apiMocks.fetchSettings.mockResolvedValue(DEFAULT_APP_SETTINGS)
  })

  it('applies optimistic settings updates before the mutation resolves', async () => {
    let resolveUpdate: ((value: typeof DEFAULT_APP_SETTINGS) => void) | null = null

    apiMocks.updateSettings.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve
        }),
    )

    const { result } = renderHook(() => useAppSettings([]), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.settings.theme).toBe('dark')

    act(() => {
      void result.current.setTheme('light')
    })

    await waitFor(() => expect(result.current.settings.theme).toBe('light'))
    expect(apiMocks.updateSettings).toHaveBeenCalledWith({ theme: 'light' })

    act(() => {
      resolveUpdate?.({
        ...DEFAULT_APP_SETTINGS,
        theme: 'light',
      })
    })

    await waitFor(() => expect(result.current.isSaving).toBe(false))
    expect(result.current.settings.theme).toBe('light')
  })

  it('rolls back optimistic settings updates when the mutation fails', async () => {
    let rejectUpdate: ((error: Error) => void) | null = null

    apiMocks.updateSettings.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectUpdate = reject
        }),
    )

    const { result } = renderHook(() => useAppSettings([]), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let mutationPromise: Promise<unknown> | null = null
    act(() => {
      mutationPromise = result.current.setTheme('light')
    })

    await waitFor(() => expect(result.current.settings.theme).toBe('light'))

    act(() => {
      rejectUpdate?.(new Error('save failed'))
    })

    await expect(mutationPromise).rejects.toThrow('save failed')
    await waitFor(() => expect(result.current.settings.theme).toBe('dark'))
    expect(result.current.isSaving).toBe(false)
  })

  it('reuses fresh bootstrap settings without refetching on mount', async () => {
    const bootstrapSettings = {
      ...DEFAULT_APP_SETTINGS,
      theme: 'light' as const,
    }
    const fetchedAt = Date.now()

    const { result } = renderHook(() => useAppSettings([], bootstrapSettings, true, fetchedAt), {
      wrapper: createWrapper(),
    })

    expect(result.current.settings.theme).toBe('light')
    expect(result.current.isLoading).toBe(false)
    await waitFor(() => expect(apiMocks.fetchSettings).not.toHaveBeenCalled())
  })

  it('treats bootstrap settings as stale when the fetch timestamp is missing', async () => {
    const bootstrapSettings = {
      ...DEFAULT_APP_SETTINGS,
      theme: 'light' as const,
    }

    renderHook(() => useAppSettings([], bootstrapSettings, true, null), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(apiMocks.fetchSettings).toHaveBeenCalledTimes(1))
  })
})
