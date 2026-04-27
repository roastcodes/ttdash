import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createClientErrorResponse, createServerLifecycle } =
  require('../../server/server-lifecycle.js') as {
    createClientErrorResponse: () => string
    createServerLifecycle: (options: Record<string, unknown>) => {
      runCli: () => Promise<void>
      server: EventEmitter
      shutdown: (signal: string) => void
      start: () => Promise<void>
    }
  }
const { createServerRuntimeState } = require('../../server/runtime-state.js') as {
  createServerRuntimeState: (options: {
    id: string
    pid: number
    startedAt: string
    mode: string
  }) => {
    getRuntimeInstance: () => { id: string; pid: number; startedAt: string; mode: string }
    getSnapshot: () => { id: string; mode: string; port: number | null; url: string | null }
    setListening: (listeningState: { port: number; url: string }) => void
  }
}

class FakeServer extends EventEmitter {
  close(callback: () => void) {
    callback()
  }
}

function createLifecycleFixture(overrides: Record<string, unknown> = {}) {
  const runtimeState = createServerRuntimeState({
    id: 'runtime-1',
    pid: 1234,
    startedAt: '2026-04-26T00:00:00.000Z',
    mode: 'foreground',
  })
  const calls: string[] = []
  const fakeServer = new FakeServer()
  const errorLog = vi.fn()
  const log = vi.fn()
  const processObject = {
    pid: 1234,
    exit: vi.fn(),
    on: vi.fn(),
  }
  const backgroundRuntime = {
    paths: { backgroundLogDir: '/logs' },
    createBackgroundInstance: vi.fn((entry) => ({ id: 'background', ...entry })),
    registerBackgroundInstance: vi.fn(async () => calls.push('registerBackgroundInstance')),
    runStopCommand: vi.fn(async () => calls.push('runStopCommand')),
    startInBackground: vi.fn(async () => calls.push('startInBackground')),
    unregisterBackgroundInstance: vi.fn(async () => calls.push('unregisterBackgroundInstance')),
  }
  const startupRuntime = {
    openBrowser: vi.fn((url) => calls.push(`openBrowser:${url}`)),
    printStartupSummary: vi.fn((url, port) => calls.push(`printStartupSummary:${url}:${port}`)),
    runStartupAutoLoad: vi.fn(async () => calls.push('runStartupAutoLoad')),
    writeLocalAuthSessionFile: vi.fn((url) => calls.push(`writeLocalAuthSessionFile:${url}`)),
  }
  const lifecycle = createServerLifecycle({
    http: {},
    processObject,
    createServer: vi.fn(() => fakeServer),
    router: {
      handleServerRequest: vi.fn(async () => undefined),
    },
    httpUtils: {
      json: vi.fn(),
    },
    listenOnAvailablePort: vi.fn(async () => 3010),
    ensureBindHostAllowed: vi.fn(() => calls.push('ensureBindHostAllowed')),
    dataRuntime: {
      ensureAppDirs: vi.fn(() => calls.push('ensureAppDirs')),
      migrateLegacyDataFile: vi.fn(() => calls.push('migrateLegacyDataFile')),
    },
    backgroundRuntime,
    startupRuntime,
    serverAuth: {
      ensureConfigured: vi.fn(() => calls.push('ensureConfigured')),
      createBootstrapUrl: vi.fn((url: string) => `${url}/?ttdash_token=token`),
    },
    runtimeState,
    startPort: 3000,
    maxPort: 3100,
    bindHost: '127.0.0.1',
    allowRemoteBind: false,
    cliOptions: { command: null, background: false, autoLoad: false },
    isBackgroundChild: false,
    log,
    errorLog,
    ...overrides,
  })

  return {
    backgroundRuntime,
    calls,
    errorLog,
    fakeServer,
    lifecycle,
    log,
    processObject,
    runtimeState,
    startupRuntime,
  }
}

async function flushShutdownMicrotasks() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve()
  }
}

describe('server lifecycle runtime', () => {
  it('starts the server through injected runtimes and stores the runtime URL', async () => {
    const { calls, lifecycle, runtimeState } = createLifecycleFixture()

    await lifecycle.start()

    expect(runtimeState.getSnapshot()).toEqual({
      id: 'runtime-1',
      mode: 'foreground',
      port: 3010,
      url: 'http://127.0.0.1:3010',
    })
    expect(calls).toEqual([
      'ensureBindHostAllowed',
      'ensureConfigured',
      'ensureAppDirs',
      'migrateLegacyDataFile',
      'writeLocalAuthSessionFile:http://127.0.0.1:3010',
      'printStartupSummary:http://127.0.0.1:3010:3010',
      'openBrowser:http://127.0.0.1:3010/?ttdash_token=token',
    ])
  })

  it('registers background instances and runs startup auto-load only for the configured modes', async () => {
    const { backgroundRuntime, calls, lifecycle } = createLifecycleFixture({
      cliOptions: { command: null, background: false, autoLoad: true },
      isBackgroundChild: true,
    })

    await lifecycle.start()

    expect(backgroundRuntime.createBackgroundInstance).toHaveBeenCalledWith({
      port: 3010,
      url: 'http://127.0.0.1:3010',
      bootstrapUrl: 'http://127.0.0.1:3010/?ttdash_token=token',
    })
    expect(calls).toContain('registerBackgroundInstance')
    expect(calls).toContain('runStartupAutoLoad')
  })

  it('routes stop and foreground-background commands without starting the HTTP server', async () => {
    const stopFixture = createLifecycleFixture({
      cliOptions: { command: 'stop', background: false, autoLoad: false },
    })
    await stopFixture.lifecycle.runCli()
    expect(stopFixture.calls).toEqual(['runStopCommand'])

    const backgroundFixture = createLifecycleFixture({
      cliOptions: { command: null, background: true, autoLoad: false },
    })
    await backgroundFixture.lifecycle.runCli()
    expect(backgroundFixture.calls).toEqual([
      'ensureBindHostAllowed',
      'ensureConfigured',
      'startInBackground',
    ])
  })

  it('formats malformed request-path client errors consistently', () => {
    expect(createClientErrorResponse()).toContain('HTTP/1.1 400 Bad Request')
    expect(createClientErrorResponse()).toContain('{"message":"Invalid request path"}')
  })

  it('logs background unregister failures and still exits during graceful shutdown', async () => {
    const unregisterError = new Error('cannot unregister')
    const { backgroundRuntime, errorLog, lifecycle, log, processObject } = createLifecycleFixture({
      isBackgroundChild: true,
    })
    backgroundRuntime.unregisterBackgroundInstance.mockRejectedValue(unregisterError)

    lifecycle.shutdown('SIGTERM')
    await flushShutdownMicrotasks()

    expect(backgroundRuntime.unregisterBackgroundInstance).toHaveBeenCalledWith(1234)
    expect(errorLog).toHaveBeenCalledWith(unregisterError)
    expect(log).toHaveBeenCalledWith('Server stopped.')
    expect(processObject.exit).toHaveBeenCalledWith(0)
  })

  it('uses the forced shutdown path only once when the server close callback stalls', async () => {
    vi.useFakeTimers()
    try {
      const { backgroundRuntime, fakeServer, lifecycle, log, processObject } =
        createLifecycleFixture({
          isBackgroundChild: true,
        })
      fakeServer.close = vi.fn()

      lifecycle.shutdown('SIGINT')
      vi.advanceTimersByTime(3000)
      await flushShutdownMicrotasks()

      expect(backgroundRuntime.unregisterBackgroundInstance).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith('Forcing shutdown.')
      expect(processObject.exit).toHaveBeenCalledTimes(1)
      expect(processObject.exit).toHaveBeenCalledWith(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
