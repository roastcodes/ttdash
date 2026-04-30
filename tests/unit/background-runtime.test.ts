import path from 'node:path'
import { createRequire } from 'node:module'
import type * as readlinePromisesModule from 'node:readline/promises'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createBackgroundRuntime } = require('../../server/background-runtime.js') as {
  createBackgroundRuntime: (options: {
    fs: {
      readFileSync: (filePath: string, encoding: string) => string
      mkdirSync: (dirPath: string, options?: unknown) => void
      chmodSync: (filePath: string, mode: number) => void
      rmSync: (targetPath: string, options?: unknown) => void
      statSync?: (targetPath: string) => { mtimeMs: number }
      openSync?: (filePath: string, flags: string, mode: number) => number
      fchmodSync?: (fd: number, mode: number) => void
      closeSync?: (fd: number) => void
    }
    path: typeof path
    processObject: NodeJS.Process
    fetchImpl: (
      input: URL,
      init?: { headers?: Record<string, string>; signal?: AbortSignal },
    ) => Promise<{
      ok: boolean
      json: () => Promise<{ id: string; port: number }>
    }>
    spawnImpl: typeof vi.fn
    readlinePromises: typeof readlinePromisesModule
    entrypointPath: string
    appPaths: { configDir: string; cacheDir: string }
    ensureAppDirs: () => void
    ensureDir: (dirPath: string) => void
    writeJsonAtomic: (filePath: string, value: unknown) => void
    normalizeIsoTimestamp: (value: string) => string
    bindHost: string
    apiPrefix: string
    authHeader?: string | null
    remoteAuthHeader?: string | null
    runtimeInstance: { id: string; pid: number; startedAt: string }
    normalizedCliArgs: string[]
    cliOptions: { noOpen: boolean; port?: number }
    forceOpenBrowser: boolean
    isWindows: boolean
    secureDirMode: number
    secureFileMode: number
    backgroundStartTimeoutMs: number
    backgroundInstancesLockTimeoutMs: number
    backgroundInstancesLockStaleMs: number
    sleep: (durationMs: number) => Promise<void>
    isProcessRunning: (pid: number) => boolean
    formatDateTime: (value: string) => string
  }) => {
    fetchRuntimeIdentity: (
      url: string,
      requestApiPrefix?: string,
      timeoutMs?: number,
      requestAuthHeader?: string | null,
    ) => Promise<{ id: string; port: number } | null>
    pruneBackgroundInstances: () => Promise<
      Array<{ id: string; pid: number; port: number; url: string; startedAt: string }>
    >
    runStopCommand: () => Promise<void>
    startInBackground: () => Promise<void>
  }
}

type BackgroundRuntimeOptions = Parameters<typeof createBackgroundRuntime>[0]

function createTestBackgroundRuntime(overrides: Partial<BackgroundRuntimeOptions> = {}) {
  const fsMock = {
    readFileSync: vi.fn(() => '[]'),
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
    rmSync: vi.fn(),
    ...overrides.fs,
  }

  return createBackgroundRuntime({
    fs: fsMock,
    path,
    processObject: {
      ...process,
      env: {},
      execPath: process.execPath,
    } as NodeJS.Process,
    fetchImpl: vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'runtime-id', port: 3101 }),
    })),
    spawnImpl: vi.fn(),
    readlinePromises: {} as typeof readlinePromisesModule,
    entrypointPath: '/tmp/server.js',
    appPaths: {
      configDir: '/tmp/ttdash-config',
      cacheDir: '/tmp/ttdash-cache',
    },
    ensureAppDirs: vi.fn(),
    ensureDir: vi.fn(),
    writeJsonAtomic: vi.fn(),
    normalizeIsoTimestamp: (value: string) => new Date(value).toISOString(),
    bindHost: '127.0.0.1',
    apiPrefix: '/api',
    runtimeInstance: {
      id: 'runtime-id',
      pid: 999,
      startedAt: '2026-04-01T07:00:00.000Z',
    },
    normalizedCliArgs: [],
    cliOptions: {
      noOpen: true,
    },
    forceOpenBrowser: false,
    isWindows: false,
    secureDirMode: 0o700,
    secureFileMode: 0o600,
    backgroundStartTimeoutMs: 15_000,
    backgroundInstancesLockTimeoutMs: 5_000,
    backgroundInstancesLockStaleMs: 10_000,
    sleep: async () => {},
    isProcessRunning: () => true,
    formatDateTime: (value: string) => value,
    ...overrides,
    fs: fsMock,
  })
}

describe('background runtime', () => {
  it('fetches runtime identity with the requested API prefix and auth header', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'remote-runtime', port: 3107 }),
    }))
    const runtime = createTestBackgroundRuntime({
      fetchImpl,
      apiPrefix: '/default-api',
    })

    await expect(
      runtime.fetchRuntimeIdentity(
        'http://127.0.0.1:3107',
        '/custom-api/',
        250,
        'Bearer registry-token',
      ),
    ).resolves.toEqual({ id: 'remote-runtime', port: 3107 })

    expect(fetchImpl).toHaveBeenCalledWith(new URL('http://127.0.0.1:3107/custom-api/runtime'), {
      headers: { Authorization: 'Bearer registry-token' },
      signal: expect.any(AbortSignal),
    })
  })

  it('treats unavailable runtime identity responses as stale registry entries', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ id: 'ignored', port: 3101 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })
      .mockRejectedValueOnce(new Error('offline'))
    const runtime = createTestBackgroundRuntime({
      fetchImpl,
    })

    await expect(runtime.fetchRuntimeIdentity('')).resolves.toBeNull()
    await expect(runtime.fetchRuntimeIdentity('http://127.0.0.1:3101')).resolves.toBeNull()
    await expect(runtime.fetchRuntimeIdentity('http://127.0.0.1:3102')).resolves.toBeNull()
    await expect(runtime.fetchRuntimeIdentity('http://127.0.0.1:3103')).resolves.toBeNull()
  })

  it('prunes stale instances without re-reading the registry snapshot', async () => {
    const registryEntries = [
      {
        id: 'alive-instance',
        pid: 101,
        port: 3101,
        url: 'http://127.0.0.1:3101',
        startedAt: '2026-04-01T08:00:00.000Z',
      },
      {
        id: 'stale-instance',
        pid: 102,
        port: 3102,
        url: 'http://127.0.0.1:3102',
        startedAt: '2026-04-01T09:00:00.000Z',
      },
    ]
    const fsMock = {
      readFileSync: vi.fn(() => JSON.stringify(registryEntries)),
      mkdirSync: vi.fn(),
      chmodSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const writeJsonAtomic = vi.fn()
    const fetchImpl = vi.fn(async (input: URL) => {
      if (input.origin === 'http://127.0.0.1:3101') {
        return {
          ok: true,
          json: async () => ({ id: 'alive-instance', port: 3101 }),
        }
      }

      return {
        ok: true,
        json: async () => ({ id: 'other-instance', port: 3102 }),
      }
    })

    const runtime = createBackgroundRuntime({
      fs: fsMock,
      path,
      processObject: {
        ...process,
        env: {},
        execPath: process.execPath,
      } as NodeJS.Process,
      fetchImpl,
      spawnImpl: vi.fn(),
      readlinePromises: {} as typeof readlinePromisesModule,
      entrypointPath: '/tmp/server.js',
      appPaths: {
        configDir: '/tmp/ttdash-config',
        cacheDir: '/tmp/ttdash-cache',
      },
      ensureAppDirs: vi.fn(),
      ensureDir: vi.fn(),
      writeJsonAtomic,
      normalizeIsoTimestamp: (value: string) => new Date(value).toISOString(),
      bindHost: '127.0.0.1',
      apiPrefix: '/api',
      runtimeInstance: {
        id: 'runtime-id',
        pid: 999,
        startedAt: '2026-04-01T07:00:00.000Z',
      },
      normalizedCliArgs: [],
      cliOptions: {
        noOpen: true,
      },
      forceOpenBrowser: false,
      isWindows: false,
      secureDirMode: 0o700,
      secureFileMode: 0o600,
      backgroundStartTimeoutMs: 15_000,
      backgroundInstancesLockTimeoutMs: 5_000,
      backgroundInstancesLockStaleMs: 10_000,
      sleep: async () => {},
      isProcessRunning: () => true,
      formatDateTime: (value: string) => value,
    })

    const aliveInstances = await runtime.pruneBackgroundInstances()

    expect(fsMock.readFileSync).toHaveBeenCalledTimes(1)
    expect(aliveInstances).toEqual([
      expect.objectContaining({
        id: 'alive-instance',
        pid: 101,
        port: 3101,
        url: 'http://127.0.0.1:3101',
      }),
    ])
    expect(writeJsonAtomic).toHaveBeenCalledWith(
      path.join('/tmp/ttdash-config', 'background-instances.json'),
      [
        expect.objectContaining({
          id: 'alive-instance',
          pid: 101,
          port: 3101,
          url: 'http://127.0.0.1:3101',
        }),
      ],
    )
  })

  it('removes stale registry locks before reading background instances', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(20_000)
    const fsMock = {
      readFileSync: vi.fn(() => '[]'),
      mkdirSync: vi
        .fn()
        .mockImplementationOnce(() => {
          throw Object.assign(new Error('lock exists'), { code: 'EEXIST' })
        })
        .mockImplementationOnce(() => undefined),
      chmodSync: vi.fn(),
      rmSync: vi.fn(),
      statSync: vi.fn(() => ({ mtimeMs: 0 })),
    }
    const runtime = createTestBackgroundRuntime({
      fs: fsMock,
      backgroundInstancesLockStaleMs: 10_000,
    })

    try {
      await expect(runtime.pruneBackgroundInstances()).resolves.toEqual([])

      expect(fsMock.statSync).toHaveBeenCalledWith(
        path.join('/tmp/ttdash-config', 'background-instances.lock'),
      )
      expect(fsMock.rmSync).toHaveBeenCalledWith(
        path.join('/tmp/ttdash-config', 'background-instances.lock'),
        { recursive: true, force: true },
      )
      expect(fsMock.mkdirSync).toHaveBeenCalledTimes(2)
    } finally {
      dateNowSpy.mockRestore()
    }
  })

  it('fails fast with a clear error when the registry lock cannot be acquired', async () => {
    let currentTime = 0
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTime)
    const fsMock = {
      readFileSync: vi.fn(() => '[]'),
      mkdirSync: vi.fn(() => {
        throw Object.assign(new Error('lock exists'), { code: 'EEXIST' })
      }),
      chmodSync: vi.fn(),
      rmSync: vi.fn(),
      statSync: vi.fn(() => ({ mtimeMs: currentTime })),
    }
    const sleep = vi.fn(async (durationMs: number) => {
      currentTime += durationMs
    })
    const runtime = createTestBackgroundRuntime({
      fs: fsMock,
      backgroundInstancesLockTimeoutMs: 100,
      backgroundInstancesLockStaleMs: 1_000,
      sleep,
    })

    try {
      await expect(runtime.pruneBackgroundInstances()).rejects.toThrow(
        'Could not acquire background registry lock.',
      )

      expect(sleep).toHaveBeenCalledWith(50)
      expect(fsMock.rmSync).not.toHaveBeenCalled()
    } finally {
      dateNowSpy.mockRestore()
    }
  })

  it('rewrites invalid registry payloads to an empty alive snapshot', async () => {
    const invalidRegistry = [
      {
        id: 'missing-port',
        pid: 101,
        url: 'http://127.0.0.1:3101',
        startedAt: '2026-04-01T08:00:00.000Z',
      },
    ]
    const writeJsonAtomic = vi.fn()
    const runtime = createTestBackgroundRuntime({
      fs: {
        readFileSync: vi.fn(() => JSON.stringify(invalidRegistry)),
        mkdirSync: vi.fn(),
        chmodSync: vi.fn(),
        rmSync: vi.fn(),
      },
      writeJsonAtomic,
    })

    await expect(runtime.pruneBackgroundInstances()).resolves.toEqual([])
    expect(writeJsonAtomic).toHaveBeenCalledWith(
      path.join('/tmp/ttdash-config', 'background-instances.json'),
      [],
    )
  })

  it('reports permission denied when the stop command cannot signal an owned instance', async () => {
    const registryEntries = [
      {
        id: 'owned-instance',
        pid: 101,
        port: 3101,
        url: 'http://127.0.0.1:3101',
        startedAt: '2026-04-01T08:00:00.000Z',
      },
    ]
    const fsMock = {
      readFileSync: vi.fn(() => JSON.stringify(registryEntries)),
      mkdirSync: vi.fn(),
      chmodSync: vi.fn(),
      rmSync: vi.fn(),
    }
    const processObject = {
      ...process,
      env: {},
      execPath: process.execPath,
      exitCode: 0,
      kill: vi.fn(() => {
        throw Object.assign(new Error('permission denied'), { code: 'EPERM' })
      }),
    } as unknown as NodeJS.Process
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const runtime = createBackgroundRuntime({
      fs: fsMock,
      path,
      processObject,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'owned-instance', port: 3101 }),
      })),
      spawnImpl: vi.fn(),
      readlinePromises: {} as typeof readlinePromisesModule,
      entrypointPath: '/tmp/server.js',
      appPaths: {
        configDir: '/tmp/ttdash-config',
        cacheDir: '/tmp/ttdash-cache',
      },
      ensureAppDirs: vi.fn(),
      ensureDir: vi.fn(),
      writeJsonAtomic: vi.fn(),
      normalizeIsoTimestamp: (value: string) => new Date(value).toISOString(),
      bindHost: '127.0.0.1',
      apiPrefix: '/api',
      runtimeInstance: {
        id: 'runtime-id',
        pid: 999,
        startedAt: '2026-04-01T07:00:00.000Z',
      },
      normalizedCliArgs: [],
      cliOptions: {
        noOpen: true,
      },
      forceOpenBrowser: false,
      isWindows: false,
      secureDirMode: 0o700,
      secureFileMode: 0o600,
      backgroundStartTimeoutMs: 15_000,
      backgroundInstancesLockTimeoutMs: 5_000,
      backgroundInstancesLockStaleMs: 10_000,
      sleep: async () => {},
      isProcessRunning: () => true,
      formatDateTime: (value: string) => value,
    })

    try {
      await runtime.runStopCommand()

      expect(processObject.kill).toHaveBeenCalledWith(101, 'SIGTERM')
      expect(errorSpy).toHaveBeenCalledWith(
        'Could not stop TTDash background server (permission denied): http://127.0.0.1:3101 (PID 101)',
      )
      expect(processObject.exitCode).toBe(1)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('removes a registry entry when stop finds the owned process already gone', async () => {
    const registryEntries = [
      {
        id: 'owned-instance',
        pid: 101,
        port: 3101,
        url: 'http://127.0.0.1:3101',
        startedAt: '2026-04-01T08:00:00.000Z',
      },
    ]
    const writeJsonAtomic = vi.fn()
    const processObject = {
      ...process,
      env: {},
      execPath: process.execPath,
      exitCode: 0,
      kill: vi.fn(() => {
        throw Object.assign(new Error('already gone'), { code: 'ESRCH' })
      }),
    } as unknown as NodeJS.Process
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const runtime = createTestBackgroundRuntime({
      fs: {
        readFileSync: vi.fn(() => JSON.stringify(registryEntries)),
        mkdirSync: vi.fn(),
        chmodSync: vi.fn(),
        rmSync: vi.fn(),
      },
      processObject,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'owned-instance', port: 3101 }),
      })),
      writeJsonAtomic,
    })

    try {
      await runtime.runStopCommand()

      expect(writeJsonAtomic).toHaveBeenLastCalledWith(
        path.join('/tmp/ttdash-config', 'background-instances.json'),
        [],
      )
      expect(logSpy).toHaveBeenCalledWith(
        'Instance was already stopped and was removed from the registry: http://127.0.0.1:3101 (PID 101)',
      )
      expect(processObject.exitCode).toBe(0)
    } finally {
      logSpy.mockRestore()
    }
  })

  it('passes the explicit browser-open decision to background children', async () => {
    const spawnImpl = vi.fn(() => ({
      pid: 123,
      unref: vi.fn(),
    }))
    const runtime = createTestBackgroundRuntime({
      fs: {
        readFileSync: vi.fn(() => ''),
        mkdirSync: vi.fn(),
        chmodSync: vi.fn(),
        rmSync: vi.fn(),
        openSync: vi.fn(() => 42),
        fchmodSync: vi.fn(),
        closeSync: vi.fn(),
      },
      processObject: {
        ...process,
        env: {},
        execPath: '/usr/bin/node',
      } as NodeJS.Process,
      spawnImpl,
      normalizedCliArgs: ['--background'],
      cliOptions: {
        noOpen: false,
      },
      forceOpenBrowser: true,
      isProcessRunning: () => false,
    })

    await expect(runtime.startInBackground()).rejects.toThrow(
      'Could not start TTDash as a background process.',
    )
    expect(spawnImpl).toHaveBeenCalledWith(
      '/usr/bin/node',
      ['/tmp/server.js'],
      expect.objectContaining({
        env: expect.objectContaining({
          TTDASH_BACKGROUND_CHILD: '1',
          TTDASH_FORCE_OPEN_BROWSER: '1',
        }),
      }),
    )
  })

  it('reports the background log path when startup fails before the log can be read', async () => {
    const readFileSync = vi.fn(() => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    })
    const spawnImpl = vi.fn(() => ({
      pid: 123,
      unref: vi.fn(),
    }))
    const fsMock = {
      readFileSync,
      mkdirSync: vi.fn(),
      chmodSync: vi.fn(),
      rmSync: vi.fn(),
      openSync: vi.fn(() => 42),
      fchmodSync: vi.fn(),
      closeSync: vi.fn(),
    }
    const runtime = createBackgroundRuntime({
      fs: fsMock,
      path,
      processObject: {
        ...process,
        env: {},
        execPath: '/usr/bin/node',
      } as NodeJS.Process,
      fetchImpl: vi.fn(),
      spawnImpl,
      readlinePromises: {} as typeof readlinePromisesModule,
      entrypointPath: '/tmp/server.js',
      appPaths: {
        configDir: '/tmp/ttdash-config',
        cacheDir: '/tmp/ttdash-cache',
      },
      ensureAppDirs: vi.fn(),
      ensureDir: vi.fn(),
      writeJsonAtomic: vi.fn(),
      normalizeIsoTimestamp: (value: string) => value,
      bindHost: '127.0.0.1',
      apiPrefix: '/api',
      runtimeInstance: {
        id: 'runtime-id',
        pid: 999,
        startedAt: '2026-04-01T07:00:00.000Z',
      },
      normalizedCliArgs: ['--background', '--no-open'],
      cliOptions: {
        noOpen: true,
      },
      forceOpenBrowser: false,
      isWindows: false,
      secureDirMode: 0o700,
      secureFileMode: 0o600,
      backgroundStartTimeoutMs: 15_000,
      backgroundInstancesLockTimeoutMs: 5_000,
      backgroundInstancesLockStaleMs: 10_000,
      sleep: async () => {},
      isProcessRunning: () => false,
      formatDateTime: (value: string) => value,
    })

    await expect(runtime.startInBackground()).rejects.toThrow(
      'Could not start TTDash as a background process. Log: /tmp/ttdash-cache/background/server-',
    )
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/ttdash-cache/background/server-'),
      'utf-8',
    )
    expect(fsMock.openSync).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`/tmp/ttdash-cache/background/server-\\d+-${process.pid}\\.log$`),
      ),
      'a',
      0o600,
    )
    expect(fsMock.closeSync).toHaveBeenCalledWith(42)
  })
})
