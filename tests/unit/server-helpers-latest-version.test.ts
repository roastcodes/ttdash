import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TOKTRACK_VERSION,
  createSpawnSequence,
  resetServerHelperTestState,
} from './server-helpers.shared'
import { createRuntimeWithSpawn } from './server-helpers-runner-test-utils'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: toktrack latest-version lookup', () => {
  it('returns a structured warning when the latest toktrack version lookup times out', async () => {
    vi.useFakeTimers()
    const runtime = createRuntimeWithSpawn(createSpawnSequence([{ hang: true }]), {
      latestLookupTimeoutMs: 50,
    })

    try {
      const statusPromise = runtime.lookupLatestToktrackVersion()
      await vi.advanceTimersByTimeAsync(50)

      await expect(statusPromise).resolves.toMatchObject({
        configuredVersion: TOKTRACK_VERSION,
        latestVersion: null,
        isLatest: null,
        lookupStatus: 'timeout',
        message: expect.stringContaining('Command timed out'),
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns a structured warning when the latest toktrack version lookup is malformed', async () => {
    const runtime = createRuntimeWithSpawn(createSpawnSequence([{ stdout: 'not-a-version\n' }]))

    await expect(runtime.lookupLatestToktrackVersion()).resolves.toMatchObject({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: null,
      isLatest: null,
      lookupStatus: 'malformed-output',
      message: 'npm returned an invalid toktrack version: not-a-version',
    })
  })

  it('reuses a cached successful latest-version lookup until the TTL expires', async () => {
    const spawnImpl = createSpawnSequence([
      { stdout: `${TOKTRACK_VERSION}\n` },
      { stdout: '9.9.9\n' },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl)
    const nowSpy = vi.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(1_000_000)
      const firstStatus = await runtime.lookupLatestToktrackVersion()
      nowSpy.mockReturnValue(1_000_000)
      const secondStatus = await runtime.lookupLatestToktrackVersion()
      nowSpy.mockReturnValue(1_000_000 + 5 * 60 * 1000 + 1)
      const thirdStatus = await runtime.lookupLatestToktrackVersion()

      expect(firstStatus).toMatchObject({
        configuredVersion: TOKTRACK_VERSION,
        latestVersion: TOKTRACK_VERSION,
        isLatest: true,
        lookupStatus: 'ok',
      })
      expect(secondStatus).toEqual(firstStatus)
      expect(thirdStatus).toMatchObject({
        latestVersion: '9.9.9',
        isLatest: false,
        lookupStatus: 'ok',
      })
      expect(spawnImpl).toHaveBeenCalledTimes(2)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('reuses a cached failed latest-version lookup until the failure TTL expires', async () => {
    const spawnImpl = createSpawnSequence([
      { code: 1, stderr: 'lookup failed\n' },
      { code: 1, stderr: 'lookup still failed\n' },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl)
    const nowSpy = vi.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(2_000_000)
      const firstStatus = await runtime.lookupLatestToktrackVersion()
      nowSpy.mockReturnValue(2_000_000)
      const secondStatus = await runtime.lookupLatestToktrackVersion()
      nowSpy.mockReturnValue(2_000_000 + 60 * 1000 + 1)
      const thirdStatus = await runtime.lookupLatestToktrackVersion()

      expect(firstStatus).toMatchObject({
        configuredVersion: TOKTRACK_VERSION,
        latestVersion: null,
        isLatest: null,
        lookupStatus: 'failed',
        message: 'lookup failed',
      })
      expect(secondStatus).toEqual(firstStatus)
      expect(thirdStatus).toMatchObject({
        lookupStatus: 'failed',
        message: 'lookup still failed',
      })
      expect(spawnImpl).toHaveBeenCalledTimes(2)
    } finally {
      nowSpy.mockRestore()
    }
  })
})
