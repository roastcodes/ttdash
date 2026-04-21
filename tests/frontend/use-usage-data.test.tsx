// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { useDeleteData, useUploadData, useUsageData } from '@/hooks/use-usage-data'
import { createTestQueryClient, renderHookWithQueryClient } from '../test-utils'

const apiMocks = vi.hoisted(() => ({
  fetchUsage: vi.fn(),
  uploadData: vi.fn(),
  deleteUsage: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)

describe('use-usage-data hooks', () => {
  beforeEach(() => {
    apiMocks.fetchUsage.mockReset()
    apiMocks.uploadData.mockReset()
    apiMocks.deleteUsage.mockReset()
  })

  it('loads usage data through the cached query', async () => {
    apiMocks.fetchUsage.mockResolvedValue({
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
    })

    const { result } = renderHookWithQueryClient(() => useUsageData())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMocks.fetchUsage).toHaveBeenCalledTimes(1)
    expect(result.current.data?.daily).toEqual([])
  })

  it('invalidates usage queries after a successful upload', async () => {
    const client = createTestQueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    apiMocks.uploadData.mockResolvedValue({ days: 3, totalCost: 12.5 })

    const { result } = renderHookWithQueryClient(() => useUploadData(), { client })

    await result.current.mutateAsync({ daily: [] })

    expect(apiMocks.uploadData).toHaveBeenCalledWith({ daily: [] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['usage'] })
  })

  it('invalidates usage queries after a successful delete', async () => {
    const client = createTestQueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    apiMocks.deleteUsage.mockResolvedValue(undefined)

    const { result } = renderHookWithQueryClient(() => useDeleteData(), { client })

    await result.current.mutateAsync()

    expect(apiMocks.deleteUsage).toHaveBeenCalledTimes(1)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['usage'] })
  })

  it('does not invalidate usage queries when upload fails', async () => {
    const client = createTestQueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    apiMocks.uploadData.mockRejectedValue(new Error('upload failed'))

    const { result } = renderHookWithQueryClient(() => useUploadData(), { client })

    await expect(result.current.mutateAsync({ daily: [] })).rejects.toThrow('upload failed')
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
