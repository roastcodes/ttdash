import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import {
  getToktrackVersionStatusSnapshot,
  resetToktrackVersionStatusSession,
  scheduleToktrackVersionStatusWarmup,
  subscribeToktrackVersionStatus,
  warmupToktrackVersionStatus,
} from '@/lib/toktrack-version-status'

const apiMocks = vi.hoisted(() => ({
  fetchToktrackVersionStatus: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)

describe('toktrack version status session warmup', () => {
  beforeEach(() => {
    vi.useRealTimers()
    apiMocks.fetchToktrackVersionStatus.mockReset()
    resetToktrackVersionStatusSession()
  })

  it('starts from a local pinned-version snapshot before the session warmup resolves', () => {
    expect(getToktrackVersionStatusSnapshot()).toEqual({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: null,
      isLatest: null,
      lookupStatus: 'ok',
      isLoading: true,
    })
  })

  it('deduplicates concurrent warmups and publishes the resolved status', async () => {
    let resolveStatus:
      | ((value: Awaited<ReturnType<typeof warmupToktrackVersionStatus>>) => void)
      | null = null
    apiMocks.fetchToktrackVersionStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve
        }),
    )
    const listener = vi.fn()
    const unsubscribe = subscribeToktrackVersionStatus(listener)

    const firstWarmup = warmupToktrackVersionStatus()
    const secondWarmup = warmupToktrackVersionStatus()

    expect(firstWarmup).toBe(secondWarmup)
    await Promise.resolve()

    expect(apiMocks.fetchToktrackVersionStatus).toHaveBeenCalledTimes(1)
    expect(getToktrackVersionStatusSnapshot().isLoading).toBe(true)

    resolveStatus?.({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: '2.5.1',
      isLatest: false,
      lookupStatus: 'ok',
    })

    await expect(firstWarmup).resolves.toEqual({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: '2.5.1',
      isLatest: false,
      lookupStatus: 'ok',
    })
    expect(getToktrackVersionStatusSnapshot()).toMatchObject({
      latestVersion: '2.5.1',
      isLatest: false,
      lookupStatus: 'ok',
      isLoading: false,
    })
    expect(listener).toHaveBeenCalled()

    unsubscribe()
  })

  it('caches a failed warmup for the browser session instead of retrying on later reads', async () => {
    apiMocks.fetchToktrackVersionStatus.mockRejectedValue(new Error('network unavailable'))

    await expect(warmupToktrackVersionStatus()).resolves.toMatchObject({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: null,
      isLatest: null,
      lookupStatus: 'failed',
      message: 'network unavailable',
    })

    await warmupToktrackVersionStatus()

    expect(apiMocks.fetchToktrackVersionStatus).toHaveBeenCalledTimes(1)
    expect(getToktrackVersionStatusSnapshot()).toMatchObject({
      lookupStatus: 'failed',
      isLoading: false,
    })
  })

  it('schedules the session warmup without running the registry lookup synchronously', async () => {
    vi.useFakeTimers()
    apiMocks.fetchToktrackVersionStatus.mockResolvedValue({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: TOKTRACK_VERSION,
      isLatest: true,
      lookupStatus: 'ok',
    })

    scheduleToktrackVersionStatusWarmup()

    expect(apiMocks.fetchToktrackVersionStatus).not.toHaveBeenCalled()

    await vi.runOnlyPendingTimersAsync()

    expect(apiMocks.fetchToktrackVersionStatus).toHaveBeenCalledTimes(1)
  })

  it('cancels a scheduled fallback warmup before it starts', async () => {
    vi.useFakeTimers()
    apiMocks.fetchToktrackVersionStatus.mockResolvedValue({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: TOKTRACK_VERSION,
      isLatest: true,
      lookupStatus: 'ok',
    })

    const handle = scheduleToktrackVersionStatusWarmup()
    handle.cancel()

    await vi.runOnlyPendingTimersAsync()

    expect(apiMocks.fetchToktrackVersionStatus).not.toHaveBeenCalled()
  })
})
