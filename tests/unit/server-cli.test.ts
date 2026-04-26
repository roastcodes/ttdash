import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { normalizeCliArgs, parseCliArgs, printHelp } = require('../../server/cli.js') as {
  normalizeCliArgs: (args: string[]) => string[]
  parseCliArgs: (
    rawArgs: string[],
    options?: {
      appVersion?: string
      log?: (message: string) => void
      errorLog?: (message: string) => void
      exit?: (code: number) => never
    },
  ) => {
    command: string | null
    port?: number
    noOpen: boolean
    autoLoad: boolean
    background: boolean
  } | null
  printHelp: (options: { appVersion: string; log: (message: string) => void }) => void
}

class ExitError extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`)
  }
}

function throwingExit(code: number): never {
  throw new ExitError(code)
}

describe('server CLI parsing', () => {
  it('normalizes legacy short aliases before parsing', () => {
    expect(normalizeCliArgs(['-p', '3010', '-no', '-al', '-bg'])).toEqual([
      '-p',
      '3010',
      '--no-open',
      '--auto-load',
      '--background',
    ])
  })

  it('parses foreground, stop, background, no-open, auto-load, and port options', () => {
    expect(parseCliArgs(['--port', '3010', '--no-open', '--auto-load', '--background'])).toEqual({
      command: null,
      port: 3010,
      noOpen: true,
      autoLoad: true,
      background: true,
    })

    expect(parseCliArgs(['stop'])).toEqual({
      command: 'stop',
      noOpen: false,
      autoLoad: false,
      background: false,
    })
  })

  it('prints help and exits for help requests', () => {
    const lines: string[] = []

    expect(() =>
      parseCliArgs(['--help'], {
        appVersion: '1.2.3',
        log: (line) => lines.push(line),
        exit: throwingExit,
      }),
    ).toThrow(new ExitError(0))
    expect(lines[0]).toBe('TTDash v1.2.3')
    expect(lines).toContain('  ttdash stop')
  })

  it('prints a helpful error for invalid invocations', () => {
    const lines: string[] = []
    const errors: string[] = []

    expect(() =>
      parseCliArgs(['--port', '99999'], {
        appVersion: '1.2.3',
        log: (line) => lines.push(line),
        errorLog: (line) => errors.push(line),
        exit: throwingExit,
      }),
    ).toThrow(new ExitError(1))

    expect(errors).toEqual(['Invalid port: 99999'])
    expect(lines).toContain('Usage:')
  })

  it('keeps help text complete for operational flags', () => {
    const lines: string[] = []

    printHelp({ appVersion: '1.2.3', log: (line) => lines.push(line) })

    expect(lines).toContain('  -no, --no-open      Disable browser auto-open')
    expect(lines).toContain('  -al, --auto-load    Run auto-import immediately on startup')
    expect(lines).toContain('  -b, -bg, --background  Start TTDash as a background process')
    expect(lines).toContain(
      '  TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=0.0.0.0 ttdash',
    )
  })
})
