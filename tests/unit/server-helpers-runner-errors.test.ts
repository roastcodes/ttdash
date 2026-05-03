import { afterEach, describe, expect, it } from 'vitest'
import {
  TOKTRACK_VERSION,
  resetServerHelperTestState,
  toAutoImportRunnerResolutionError,
} from './server-helpers.shared'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: toktrack runner resolution errors', () => {
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

  it('prioritizes local startup failures over package runner feedback', () => {
    const error = toAutoImportRunnerResolutionError({
      localVersionMismatch: null,
      localFailure: 'permission denied',
      runnerFailures: [
        { label: 'bunx', message: 'missing', timedOut: false },
        { label: 'npm exec', message: 'missing', timedOut: false },
      ],
    })

    expect(error.messageKey).toBe('localToktrackFailed')
    expect(error.message).toContain('permission denied')
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

  it('reports a no-runner error when no resolution diagnostics are available', () => {
    const error = toAutoImportRunnerResolutionError({
      localVersionMismatch: null,
      localFailure: null,
      runnerFailures: [],
    })

    expect(error.messageKey).toBe('noRunnerFound')
    expect(error.message).toBe('No local toktrack, Bun, or npm exec installation found.')
  })
})
