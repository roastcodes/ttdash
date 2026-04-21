import { afterEach, describe, expect, it } from 'vitest'
import {
  EventEmitter,
  TOKTRACK_VERSION,
  getExecutableName,
  getLocalToktrackDisplayCommand,
  getToktrackLatestLookupTimeoutMs,
  getToktrackRunnerTimeouts,
  parseToktrackVersionOutput,
  resetServerHelperTestState,
  runCommandWithSpawn,
  toAutoImportRunnerResolutionError,
} from './server-helpers.shared'

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
