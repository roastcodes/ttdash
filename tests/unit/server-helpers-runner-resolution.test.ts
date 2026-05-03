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

describe('server helper utilities: toktrack runner resolution', () => {
  it('honors a configured local toktrack binary override for display and execution', async () => {
    const spawnImpl = createSpawnSequence([{ stdout: `toktrack ${TOKTRACK_VERSION}` }])
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      localBinExists: true,
      localBinOverride: '/custom/bin/toktrack',
    })

    expect(runtime.getLocalToktrackDisplayCommand()).toBe('/custom/bin/toktrack daily --json')

    await expect(runtime.resolveToktrackRunner()).resolves.toMatchObject({
      command: '/custom/bin/toktrack',
      displayCommand: '/custom/bin/toktrack daily --json',
      method: 'local',
    })
    expect(spawnImpl).toHaveBeenCalledWith(
      '/custom/bin/toktrack',
      ['--version'],
      expect.objectContaining({
        env: { TTDASH_TOKTRACK_LOCAL_BIN: '/custom/bin/toktrack' },
      }),
    )
  })

  it('resolves a compatible local toktrack runner without probing package fallbacks', async () => {
    const spawnImpl = createSpawnSequence([{ stdout: `toktrack ${TOKTRACK_VERSION}\n` }])
    const runtime = createRuntimeWithSpawn(spawnImpl, { localBinExists: true })

    await expect(runtime.resolveToktrackRunner()).resolves.toMatchObject({
      command: '/missing/toktrack',
      method: 'local',
      label: 'local toktrack',
    })
    expect(spawnImpl).toHaveBeenCalledTimes(1)
    expect(spawnImpl).toHaveBeenCalledWith(
      '/missing/toktrack',
      ['--version'],
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )
  })

  it('uses the local version-check timeout before probing package fallbacks', async () => {
    vi.useFakeTimers()
    const spawnImpl = createSpawnSequence([
      { hang: true },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      localBinExists: true,
      localProbeTimeoutMs: 7000,
      localVersionCheckTimeoutMs: 50,
    })

    try {
      const resolutionPromise = runtime.resolveToktrackRunner()
      await vi.advanceTimersByTimeAsync(50)

      expect(spawnImpl).toHaveBeenCalledTimes(2)
      await expect(resolutionPromise).resolves.toMatchObject({
        command: 'bunx',
        method: 'bunx',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back to npm when the local runner version mismatches and bunx probing fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const spawnImpl = createSpawnSequence([
      { stdout: 'toktrack 0.0.0\n' },
      { code: 1, stderr: 'bunx failed\n' },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl, { localBinExists: true })

    try {
      await expect(runtime.resolveToktrackRunner()).resolves.toMatchObject({
        command: 'npx',
        method: 'npm',
        label: 'npm exec',
      })
      expect(spawnImpl).toHaveBeenCalledTimes(3)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to probe bunx'))
    } finally {
      warnSpy.mockRestore()
    }
  })
})
