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

function createRuntimeWithSpawn(
  spawnImpl: ReturnType<typeof createSpawnSequence>,
  options: { localBinExists?: boolean } = {},
) {
  return createAutoImportRuntime({
    fs: {
      existsSync: (filePath: string) =>
        Boolean(options.localBinExists && filePath === '/missing/toktrack'),
    },
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

  it('uses stdout as the toktrack command error message when stderr is empty', async () => {
    const spawnImpl = createSpawnSequence([{ code: 1, stdout: 'stdout failure\n' }])
    const runtime = createRuntimeWithSpawn(spawnImpl)

    await expect(
      runtime.runToktrack(
        {
          command: 'fake-runner',
          prefixArgs: ['--prefix'],
          env: { PATH: '/fake-bin' },
        },
        ['--version'],
      ),
    ).rejects.toMatchObject({
      message: 'stdout failure',
      stdout: 'stdout failure\n',
      stderr: '',
      exitCode: 1,
    })
    expect(spawnImpl).toHaveBeenCalledWith(
      'fake-runner',
      ['--prefix', '--version'],
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { PATH: '/fake-bin' },
      }),
    )
  })

  it('streams stderr and lets callers terminate a running command on close', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const stderrLines: string[] = []
    let closeCommand: (() => void) | null = null

    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      streamStderr: true,
      onStderr: (line) => stderrLines.push(line),
      signalOnClose: (close) => {
        closeCommand = close
      },
      spawnImpl,
    })

    child.stderr.emit('data', Buffer.from('runner warning\n'))
    expect(stderrLines).toEqual(['runner warning'])

    closeCommand?.()

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'runner warning',
      stderr: 'runner warning\n',
      exitCode: 143,
    })
  })

  it('wraps spawn errors with command diagnostics', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const outcomePromise = runCommandWithSpawn('missing-runner', ['--version'], {
      spawnImpl,
    })

    child.emit('error', new Error('spawn denied'))

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'spawn denied',
      command: 'missing-runner',
      args: ['--version'],
      stdout: '',
      stderr: '',
    })
  })

  it('waits for timed-out toktrack commands to exit before rejecting', async () => {
    vi.useFakeTimers()

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
    const spawnImpl = vi.fn(() => child) as unknown as ReturnType<typeof createSpawnSequence>
    const runtime = createRuntimeWithSpawn(spawnImpl)
    let settled = false

    try {
      const outcomePromise = runtime
        .runToktrack(
          {
            command: 'fake-runner',
            prefixArgs: [],
            env: {},
          },
          ['daily', '--json'],
          { timeoutMs: 50 },
        )
        .then((value) => ({ ok: true as const, value }))
        .catch((error) => ({ ok: false as const, error }))
        .finally(() => {
          settled = true
        })

      await vi.advanceTimersByTimeAsync(50)
      expect(settled).toBe(false)

      await vi.advanceTimersByTimeAsync(150)
      await expect(outcomePromise).resolves.toMatchObject({
        ok: false,
        error: {
          message: expect.stringContaining('Command timed out'),
          timedOut: true,
        },
      })
    } finally {
      vi.useRealTimers()
    }
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
