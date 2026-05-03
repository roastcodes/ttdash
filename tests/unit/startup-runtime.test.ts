import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const { createStartupRuntime, formatCurrency, formatDayCount, formatErrorMessage, formatInteger } =
  require('../../server/startup-runtime.js') as {
    createStartupRuntime: (options: Record<string, unknown>) => {
      describeDataFile: () => string
      openBrowser: (url: string) => void
      printStartupSummary: (url: string, port: number) => void
      runStartupAutoLoad: (options?: { source?: string }) => Promise<void>
      shouldOpenBrowser: () => boolean
      writeLocalAuthSessionFile: (url: string, runtimeInstance: { id: string }) => void
    }
    formatCurrency: (value: number) => string
    formatDayCount: (value: number) => string
    formatErrorMessage: (error: unknown) => string
    formatInteger: (value: number) => string
  }

function createStartupRuntimeFixture(overrides: Record<string, unknown> = {}) {
  const logs: string[] = []
  const errors: string[] = []
  const writes: Array<{ filePath: string; data: unknown }> = []
  const spawnCalls: Array<{ command: string; args: string[] }> = []
  const processObject = {
    env: {},
    pid: 1234,
    platform: 'darwin',
    stdout: { isTTY: true },
  }
  const dataRuntime = {
    paths: {
      dataFile: '/data/data.json',
      settingsFile: '/config/settings.json',
    },
    readData: vi.fn(() => ({
      daily: [{ date: '2026-04-26' }],
      totals: { totalCost: 12.34, totalTokens: 5678 },
    })),
    writeJsonAtomic: vi.fn((filePath, data) => {
      writes.push({ filePath, data })
    }),
  }
  const serverAuth = {
    mode: 'local',
    createBootstrapUrl: vi.fn((url: string) => `${url}/?ttdash_token=local-token`),
    getAuthorizationHeader: vi.fn(() => 'Bearer local-token'),
    isLocalRequired: vi.fn(() => true),
    isRemoteRequired: vi.fn(() => false),
  }
  const runtime = createStartupRuntime({
    fs: { existsSync: vi.fn(() => true) },
    spawnImpl: vi.fn((command, args) => {
      spawnCalls.push({ command, args })
      return {
        on: vi.fn(),
        unref: vi.fn(),
      }
    }),
    processObject,
    appLabel: 'TTDash',
    appVersion: '6.2.7',
    staticRoot: '/app/dist',
    dataRuntime,
    serverAuth,
    localAuthSessionFile: '/config/session-auth.json',
    apiPrefix: '/api',
    bindHost: '127.0.0.1',
    cliOptions: { noOpen: false, autoLoad: false },
    isBackgroundChild: false,
    forceOpenBrowser: false,
    isLoopbackHost: (host: string) => host === '127.0.0.1',
    autoImportRuntime: {
      formatAutoImportMessageEvent: (event: { key: string }) => event.key,
      performAutoImport: vi.fn(async ({ onCheck, onProgress, onOutput }) => {
        onCheck({ status: 'found', method: 'local', version: TOKTRACK_VERSION })
        onProgress({ key: 'processingUsageData' })
        onOutput('toktrack output')
        return { days: 2, totalCost: 1.23 }
      }),
    },
    markStartupAutoLoadCompleted: vi.fn(),
    log: (line: string) => logs.push(line),
    errorLog: (line: string) => errors.push(line),
    ...overrides,
  })

  return {
    dataRuntime,
    errors,
    logs,
    processObject,
    runtime,
    serverAuth,
    spawnCalls,
    writes,
  }
}

describe('startup runtime', () => {
  it('formats startup data summaries without server entrypoint state', () => {
    const { dataRuntime, runtime } = createStartupRuntimeFixture()

    expect(formatCurrency(123.45)).toBe('$ 123')
    expect(formatCurrency(-123.45)).toBe('$-123')
    expect(formatDayCount(1)).toBe('1 day')
    expect(formatDayCount(2)).toBe('2 days')
    expect(formatErrorMessage(' plain failure ')).toBe('plain failure')
    expect(formatErrorMessage({ code: 'E_TTDASH' })).toBe('{"code":"E_TTDASH"}')
    expect(formatInteger(12_345)).toBe("12'345")
    expect(formatInteger(12_345.6)).toBe("12'346")
    expect(runtime.describeDataFile()).toBe("1 day, $ 12.34, 5'678 tokens")

    dataRuntime.readData.mockReturnValue({
      daily: [{ date: '2026-04-25' }, { date: '2026-04-26' }],
      totals: { totalCost: 12.34, totalTokens: 5678 },
    })
    expect(runtime.describeDataFile()).toBe("2 days, $ 12.34, 5'678 tokens")
  })

  it('prints local auth bootstrap details only when the browser will not auto-open', () => {
    const { logs, runtime } = createStartupRuntimeFixture({
      processObject: {
        env: { NO_OPEN_BROWSER: '1' },
        pid: 1234,
        platform: 'darwin',
        stdout: { isTTY: true },
      },
    })

    runtime.printStartupSummary('http://127.0.0.1:3000', 3000)

    expect(logs).toContain('  Local Auth:     required')
    expect(logs).toContain('  Browser Open:   disabled')
    expect(logs).toContain('  Local Auth URL: http://127.0.0.1:3000/?ttdash_token=local-token')
  })

  it('prints API and curl URLs with the configured API prefix', () => {
    const { logs, runtime } = createStartupRuntimeFixture({
      apiPrefix: '/custom-api',
      processObject: {
        env: { NO_OPEN_BROWSER: '1' },
        pid: 1234,
        platform: 'darwin',
        stdout: { isTTY: true },
      },
    })

    runtime.printStartupSummary('http://127.0.0.1:3000', 3000)

    expect(logs).toContain('  API:            http://127.0.0.1:3000/custom-api/usage')
    expect(logs).toContain(
      '  curl -H "Authorization: Bearer <session-token-from-local-auth-url>" http://127.0.0.1:3000/custom-api/usage',
    )
  })

  it('treats any CI value as non-interactive', () => {
    const { runtime } = createStartupRuntimeFixture({
      processObject: {
        env: { CI: 'true' },
        pid: 1234,
        platform: 'darwin',
        stdout: { isTTY: true },
      },
    })

    expect(runtime.shouldOpenBrowser()).toBe(false)
  })

  it('prints remote auth status without advertising URL token bootstrap', () => {
    const serverAuth = {
      mode: 'remote',
      createBootstrapUrl: vi.fn((url: string) => url),
      getAuthorizationHeader: vi.fn(() => ['Bearer', 'remote-token'].join(' ')),
      isLocalRequired: vi.fn(() => false),
      isRemoteRequired: vi.fn(() => true),
    }
    const { logs, runtime } = createStartupRuntimeFixture({
      bindHost: '0.0.0.0',
      isLoopbackHost: () => false,
      serverAuth,
    })

    runtime.printStartupSummary('http://0.0.0.0:3000', 3000)

    expect(logs).toContain('  Remote Auth:    required')
    expect(logs).toContain('Use the bearer-token curl example below for remote API access.')
    expect(logs).not.toContain(
      'Open remote browsers once with ?ttdash_token=<TTDASH_REMOTE_TOKEN>.',
    )
    expect(logs).toContain(
      '  curl -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" http://0.0.0.0:3000/api/usage',
    )
  })

  it('opens the platform browser with the provided bootstrap URL when allowed', () => {
    const { runtime, spawnCalls } = createStartupRuntimeFixture()

    runtime.openBrowser('http://127.0.0.1:3000/?ttdash_token=local-token')

    expect(spawnCalls).toEqual([
      {
        command: 'open',
        args: ['http://127.0.0.1:3000/?ttdash_token=local-token'],
      },
    ])
  })

  it('writes local auth session metadata when local auth is required', () => {
    const { runtime, writes } = createStartupRuntimeFixture({
      processObject: {
        env: { TTDASH_AUTH_STATUS_FILE: '/tmp/ttdash-auth-status.json' },
        pid: 1234,
        platform: 'darwin',
        stdout: { isTTY: true },
      },
    })

    runtime.writeLocalAuthSessionFile('http://127.0.0.1:3000', { id: 'runtime-1' })

    expect(writes).toHaveLength(2)
    expect(writes[0]).toMatchObject({
      filePath: '/config/session-auth.json',
      data: {
        version: 1,
        mode: 'local',
        instanceId: 'runtime-1',
        pid: 1234,
        url: 'http://127.0.0.1:3000',
        apiPrefix: '/api',
        authorizationHeader: 'Bearer local-token',
        bootstrapUrl: 'http://127.0.0.1:3000/?ttdash_token=local-token',
      },
    })
    expect(writes[1]).toMatchObject({
      filePath: '/tmp/ttdash-auth-status.json',
      data: {
        authorizationHeader: 'Bearer local-token',
        bootstrapUrl: 'http://127.0.0.1:3000/?ttdash_token=local-token',
      },
    })
  })

  it('marks startup auto-load complete only after a successful import', async () => {
    const markStartupAutoLoadCompleted = vi.fn()
    const { logs, runtime } = createStartupRuntimeFixture({
      markStartupAutoLoadCompleted,
    })

    await runtime.runStartupAutoLoad()

    expect(markStartupAutoLoadCompleted).toHaveBeenCalledTimes(1)
    expect(logs).toContain(`toktrack found (local, v${TOKTRACK_VERSION})`)
    expect(logs).toContain('processingUsageData')
    expect(logs).toContain('Auto-load complete: imported 2 days, $ 1.23.')
  })

  it('logs non-error auto-load failures defensively', async () => {
    const markStartupAutoLoadCompleted = vi.fn()
    const { errors, runtime } = createStartupRuntimeFixture({
      autoImportRuntime: {
        formatAutoImportMessageEvent: (event: { key: string }) => event.key,
        performAutoImport: vi.fn(async () => {
          throw 'string failure'
        }),
      },
      markStartupAutoLoadCompleted,
    })

    await runtime.runStartupAutoLoad()

    expect(markStartupAutoLoadCompleted).not.toHaveBeenCalled()
    expect(errors).toEqual([
      'Auto-load failed: string failure',
      'Dashboard will start without newly imported data.',
    ])
  })
})
