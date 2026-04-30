import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EventEmitter,
  TOKTRACK_VERSION,
  createAutoImportRuntime,
  getExecutableName,
  getLocalToktrackDisplayCommand,
  getToktrackLatestLookupTimeoutMs,
  getToktrackRunnerTimeouts,
  parseToktrackVersionOutput,
  resetServerHelperTestState,
  runCommandWithSpawn,
  toAutoImportRunnerResolutionError,
} from './server-helpers.shared'

type FakeSpawnOutcome = {
  code?: number
  hang?: boolean
  stderr?: string
  stdout?: string
}

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  exitCode: number | null = null

  kill(signal: string) {
    if (this.exitCode !== null) {
      return
    }

    this.exitCode = signal === 'SIGKILL' ? 137 : 143
    queueMicrotask(() => this.emit('close', this.exitCode))
  }
}

function createSpawnSequence(outcomes: FakeSpawnOutcome[]) {
  const pendingOutcomes = [...outcomes]

  return vi.fn(() => {
    const child = new FakeChildProcess()
    const outcome = pendingOutcomes.shift() ?? { code: 0, stdout: '' }

    if (!outcome.hang) {
      queueMicrotask(() => {
        if (outcome.stdout) child.stdout.emit('data', Buffer.from(outcome.stdout))
        if (outcome.stderr) child.stderr.emit('data', Buffer.from(outcome.stderr))
        child.exitCode = outcome.code ?? 0
        child.emit('close', child.exitCode)
      })
    }

    return child
  })
}

function createRuntimeWithSpawn(spawnImpl: ReturnType<typeof createSpawnSequence>) {
  return createAutoImportRuntime({
    fs: { existsSync: () => false },
    processObject: { env: {} },
    spawnCrossPlatform: spawnImpl,
    normalizeIncomingData: (input: unknown) => input,
    withSettingsAndDataMutationLock: async (operation: () => Promise<unknown>) => operation(),
    writeData: () => undefined,
    updateDataLoadState: async () => undefined,
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
  })
}

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: toktrack runner core behavior', () => {
  it('maps executable names correctly across platforms', () => {
    expect(getExecutableName('npm', true)).toBe('npm.cmd')
    expect(getExecutableName('bun', true)).toBe('bun.exe')
    expect(getExecutableName('bunx', true)).toBe('bun.exe')
    expect(getExecutableName('npx', true)).toBe('npx.cmd')
    expect(getExecutableName('toktrack', true)).toBe('toktrack')
    expect(getExecutableName('npm', false)).toBe('npm')
    expect(getExecutableName('bun', false)).toBe('bun')
    expect(getExecutableName('bunx', false)).toBe('bunx')
    expect(getExecutableName('npx', false)).toBe('npx')
  })

  it('renders the local toktrack command example correctly across platforms', () => {
    expect(getLocalToktrackDisplayCommand(false)).toBe('node_modules/.bin/toktrack daily --json')
    expect(getLocalToktrackDisplayCommand(true)).toBe(
      'node_modules\\.bin\\toktrack.cmd daily --json',
    )
  })

  it('parses toktrack version banners down to the raw version', () => {
    expect(parseToktrackVersionOutput(`toktrack ${TOKTRACK_VERSION}`)).toBe(TOKTRACK_VERSION)
    expect(parseToktrackVersionOutput(`${TOKTRACK_VERSION}\n`)).toBe(TOKTRACK_VERSION)
  })

  it('uses longer warmup timeouts for package runners than for local toktrack', () => {
    const localTimeouts = getToktrackRunnerTimeouts({ method: 'local' })
    const bunxTimeouts = getToktrackRunnerTimeouts({ method: 'bunx' })
    const npxTimeouts = getToktrackRunnerTimeouts({ method: 'npm' })

    expect(localTimeouts).toEqual({
      probeMs: 7000,
      versionCheckMs: 7000,
      importMs: 60000,
    })
    expect(bunxTimeouts).toEqual({
      probeMs: 45000,
      versionCheckMs: 45000,
      importMs: 60000,
    })
    expect(npxTimeouts).toEqual(bunxTimeouts)
  })

  it('uses a less aggressive timeout for latest-version registry lookups', () => {
    expect(getToktrackLatestLookupTimeoutMs()).toBe(15000)
  })

  it('returns a structured warning when the latest toktrack version lookup times out', async () => {
    vi.useFakeTimers()
    const runtime = createRuntimeWithSpawn(createSpawnSequence([{ hang: true }]))

    try {
      const statusPromise = runtime.lookupLatestToktrackVersion(50)
      await vi.advanceTimersByTimeAsync(50)

      await expect(statusPromise).resolves.toMatchObject({
        configuredVersion: TOKTRACK_VERSION,
        latestVersion: null,
        isLatest: null,
        lookupStatus: 'failed',
        message: expect.stringContaining('Command timed out'),
      })
    } finally {
      vi.useRealTimers()
    }
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

  it('waits for timed-out toktrack commands to exit before rejecting', async () => {
    class FakeChild extends EventEmitter {
      stdout = new EventEmitter()
      stderr = new EventEmitter()
      exitCode: number | null = null

      kill(signal: string) {
        if (signal !== 'SIGTERM') {
          this.exitCode = 137
          this.emit('close', 137)
          return
        }

        setTimeout(() => {
          this.exitCode = 143
          this.emit('close', 143)
        }, 150)
      }
    }

    const child = new FakeChild()
    let settled = false
    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      timeoutMs: 50,
      spawnImpl: () => child,
    })
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => ({ ok: false as const, error }))
      .finally(() => {
        settled = true
      })

    await new Promise((resolve) => setTimeout(resolve, 75))
    expect(settled).toBe(false)

    await expect(outcomePromise).resolves.toMatchObject({
      ok: false,
      error: {
        message: expect.stringContaining('Command timed out'),
        timedOut: true,
      },
    })
  })

  it('prioritizes local version mismatches over generic no-runner feedback', () => {
    const error = toAutoImportRunnerResolutionError({
      localVersionMismatch: {
        detectedVersion: '9.9.9',
        expectedVersion: TOKTRACK_VERSION,
      },
      localFailure: null,
      runnerFailures: [{ label: 'bunx', message: 'missing', timedOut: false }],
    })

    expect(error.messageKey).toBe('localToktrackVersionMismatch')
    expect(error.message).toContain('9.9.9')
    expect(error.message).toContain(TOKTRACK_VERSION)
  })

  it('reports package runner failures when no compatible fallback succeeds', () => {
    const error = toAutoImportRunnerResolutionError({
      localVersionMismatch: null,
      localFailure: null,
      runnerFailures: [
        { label: 'bunx', message: 'failed to start', timedOut: false },
        { label: 'npm exec', message: 'permission denied', timedOut: false },
      ],
    })

    expect(error.messageKey).toBe('packageRunnerFailed')
    expect(error.message).toContain('bunx: failed to start')
    expect(error.message).toContain('npm exec: permission denied')
  })

  it('surfaces a dedicated warmup-timeout message when only package runners time out', () => {
    const error = toAutoImportRunnerResolutionError({
      localVersionMismatch: null,
      localFailure: null,
      runnerFailures: [
        { label: 'bunx', message: 'Command timed out', timedOut: true },
        { label: 'npm exec', message: 'Command timed out', timedOut: true },
      ],
    })

    expect(error.messageKey).toBe('packageRunnerWarmupTimedOut')
    expect(error.message).toContain('bunx / npm exec')
    expect(error.message).toContain('45s')
  })
})
