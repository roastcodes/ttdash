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
    pruneBackgroundInstances: () => Promise<
      Array<{ id: string; pid: number; port: number; url: string; startedAt: string }>
    >
    runStopCommand: () => Promise<void>
    startInBackground: () => Promise<void>
  }
}

describe('background runtime', () => {
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
    expect(fsMock.closeSync).toHaveBeenCalledWith(42)
  })
})
