import { afterEach, describe, expect, it } from 'vitest'
import {
  TOKTRACK_VERSION,
  getExecutableName,
  getLocalToktrackDisplayCommand,
  getToktrackLatestLookupTimeoutMs,
  getToktrackRunnerTimeouts,
  parseToktrackVersionOutput,
  resetServerHelperTestState,
} from './server-helpers.shared'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: toktrack runner utils', () => {
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
})
