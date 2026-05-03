import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TOKTRACK_VERSION,
  createAutoImportRuntime,
  createSpawnSequence,
  resetServerHelperTestState,
} from './server-helpers.shared'

function createRuntimeWithSpawn(
  spawnImpl: ReturnType<typeof createSpawnSequence>,
  options: {
    normalizeIncomingData?: (input: unknown) => unknown
    updateDataLoadState?: ReturnType<typeof vi.fn>
    withSettingsAndDataMutationLock?: ReturnType<typeof vi.fn>
    writeData?: ReturnType<typeof vi.fn>
  } = {},
) {
  return createAutoImportRuntime({
    fs: {
      existsSync: () => false,
    },
    processObject: { env: {} },
    spawnCrossPlatform: spawnImpl,
    normalizeIncomingData: options.normalizeIncomingData ?? ((input: unknown) => input),
    withSettingsAndDataMutationLock:
      options.withSettingsAndDataMutationLock ??
      vi.fn(async (operation: () => Promise<unknown>) => operation()),
    writeData: options.writeData ?? vi.fn(),
    updateDataLoadState: options.updateDataLoadState ?? vi.fn(async () => undefined),
    toktrackPackageName: 'toktrack',
    toktrackPackageSpec: `toktrack@${TOKTRACK_VERSION}`,
    toktrackVersion: TOKTRACK_VERSION,
    toktrackLocalBin: '/missing/toktrack',
    npxCacheDir: '/tmp/ttdash-test-npx-cache',
    isWindows: false,
    processTerminationGraceMs: 1000,
    toktrackLocalRunnerProbeTimeoutMs: 7000,
    toktrackLocalRunnerVersionCheckTimeoutMs: 7000,
    toktrackLocalRunnerImportTimeoutMs: 60000,
    toktrackPackageRunnerProbeTimeoutMs: 45000,
    toktrackPackageRunnerVersionCheckTimeoutMs: 45000,
    toktrackPackageRunnerImportTimeoutMs: 60000,
    toktrackLatestLookupTimeoutMs: 15000,
    toktrackLatestCacheSuccessTtlMs: 5 * 60 * 1000,
    toktrackLatestCacheFailureTtlMs: 60 * 1000,
    probeLog: () => undefined,
  })
}

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: auto-import executor behavior', () => {
  it('imports toktrack JSON through the mutation lock and reports structured progress', async () => {
    const rawPayload = { daily: [{ date: '2026-05-01' }] }
    const normalizedPayload = {
      daily: [{ date: '2026-05-01' }],
      totals: { totalCost: 12.5 },
    }
    const spawnImpl = createSpawnSequence([
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: JSON.stringify(rawPayload), stderr: 'runner progress\n' },
    ])
    const normalizeIncomingData = vi.fn(() => normalizedPayload)
    const writeData = vi.fn()
    const updateDataLoadState = vi.fn(async () => undefined)
    const lockEvents: string[] = []
    const withSettingsAndDataMutationLock = vi.fn(async (operation: () => Promise<unknown>) => {
      lockEvents.push('lock')
      const result = await operation()
      lockEvents.push('unlock')
      return result
    })
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      normalizeIncomingData,
      updateDataLoadState,
      withSettingsAndDataMutationLock,
      writeData,
    })
    const checks: Array<Record<string, unknown>> = []
    const progress: Array<{ key: string; vars?: Record<string, string | number> }> = []
    const output: string[] = []

    await expect(
      runtime.performAutoImport({
        source: 'unit-test',
        onCheck: (event) => checks.push(event),
        onProgress: (event) => progress.push(event),
        onOutput: (line) => output.push(line),
      }),
    ).resolves.toEqual({
      days: 1,
      totalCost: 12.5,
    })

    expect(normalizeIncomingData).toHaveBeenCalledWith(rawPayload)
    expect(withSettingsAndDataMutationLock).toHaveBeenCalledTimes(1)
    expect(lockEvents).toEqual(['lock', 'unlock'])
    expect(writeData).toHaveBeenCalledWith(normalizedPayload)
    expect(updateDataLoadState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastLoadSource: 'unit-test',
      }),
    )
    expect(checks).toEqual([
      { tool: 'toktrack', status: 'checking' },
      {
        tool: 'toktrack',
        status: 'found',
        method: 'bunx',
        version: TOKTRACK_VERSION,
      },
    ])
    expect(progress.map((event) => event.key)).toEqual([
      'startingLocalImport',
      'warmingUpPackageRunner',
      'loadingUsageData',
    ])
    expect(output).toEqual(['runner progress\n'])
    expect(runtime.isAutoImportRunning()).toBe(false)
  })

  it('surfaces normalizer failures as structured invalid-data errors without writing data', async () => {
    const spawnImpl = createSpawnSequence([
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: JSON.stringify({ daily: [] }) },
    ])
    const writeData = vi.fn()
    const updateDataLoadState = vi.fn(async () => undefined)
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      normalizeIncomingData: () => {
        throw new Error('Unsupported usage payload')
      },
      updateDataLoadState,
      writeData,
    })

    await expect(runtime.performAutoImport()).rejects.toMatchObject({
      messageKey: 'toktrackInvalidData',
      messageVars: {
        message: 'Unsupported usage payload',
      },
    })

    expect(writeData).not.toHaveBeenCalled()
    expect(updateDataLoadState).not.toHaveBeenCalled()
    expect(runtime.isAutoImportRunning()).toBe(false)
  })

  it('rejects a second import while the singleton lease is active without spawning toktrack', async () => {
    const spawnImpl = createSpawnSequence([])
    const runtime = createRuntimeWithSpawn(spawnImpl)
    const lease = runtime.acquireAutoImportLease()

    try {
      await expect(runtime.performAutoImport()).rejects.toMatchObject({
        messageKey: 'autoImportRunning',
      })
      expect(spawnImpl).not.toHaveBeenCalled()
      expect(runtime.isAutoImportRunning()).toBe(true)
    } finally {
      lease.release()
    }

    expect(runtime.isAutoImportRunning()).toBe(false)
  })

  it('leaves caller-owned leases active until the caller releases them', async () => {
    const spawnImpl = createSpawnSequence([
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: JSON.stringify({ daily: [{ date: '2026-05-01' }] }) },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      normalizeIncomingData: () => ({
        daily: [{ date: '2026-05-01' }],
        totals: { totalCost: 1.23 },
      }),
    })
    const lease = runtime.acquireAutoImportLease()

    try {
      await expect(
        runtime.performAutoImport({
          lease,
        }),
      ).resolves.toEqual({
        days: 1,
        totalCost: 1.23,
      })
      expect(runtime.isAutoImportRunning()).toBe(true)
    } finally {
      lease.release()
    }

    expect(runtime.isAutoImportRunning()).toBe(false)
  })

  it('formats startup auto-load totals with the shared server currency formatter', async () => {
    const spawnImpl = createSpawnSequence([
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: JSON.stringify({ daily: [{ date: '2026-05-01' }] }) },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      normalizeIncomingData: () => ({
        daily: [{ date: '2026-05-01' }],
        totals: { totalCost: 1.23 },
      }),
    })
    const logs: string[] = []
    const errors: string[] = []

    await expect(
      runtime.runStartupAutoLoad({
        log: (message) => logs.push(message),
        errorLog: (message) => errors.push(message),
      }),
    ).resolves.toEqual({
      days: 1,
      totalCost: 1.23,
    })

    expect(logs).toContain('Auto-load complete: imported 1 day, $ 1.23.')
    expect(errors).toEqual([])
  })

  it('logs non-error startup auto-load failures defensively', async () => {
    const spawnImpl = createSpawnSequence([
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: `toktrack ${TOKTRACK_VERSION}\n` },
      { stdout: JSON.stringify({ daily: [{ date: '2026-05-01' }] }) },
    ])
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      normalizeIncomingData: () => ({
        daily: [{ date: '2026-05-01' }],
        totals: { totalCost: 1.23 },
      }),
      withSettingsAndDataMutationLock: vi.fn(async () => {
        throw 'lock failed'
      }),
    })
    const errors: string[] = []

    await expect(
      runtime.runStartupAutoLoad({
        log: () => undefined,
        errorLog: (message) => errors.push(message),
      }),
    ).resolves.toBeNull()

    expect(errors).toEqual([
      'Auto-load failed: lock failed',
      'Dashboard will start without newly imported data.',
    ])
  })
})
