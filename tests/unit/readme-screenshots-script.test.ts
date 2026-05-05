import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const {
  closeBrowserResources,
  createAuthHeaders,
  createScreenshotAuthSession,
  isChildProcessRunning,
  seedSampleUsageFile,
  stopServer,
  waitForServer,
} = require('../../scripts/capture-readme-screenshots.js') as {
  closeBrowserResources: (
    context?: { close: () => Promise<void> },
    browser?: { close: () => Promise<void> },
  ) => Promise<void>
  createAuthHeaders: (authSession: { authorizationHeader?: string } | null) => HeadersInit
  createScreenshotAuthSession: (
    url?: string,
    token?: string,
  ) => {
    authorizationHeader: string
    bootstrapUrl: string
  }
  seedSampleUsageFile: (options?: {
    loadedAt?: string
    sampleUsage?: unknown
    sampleUsageFile?: string
    runtimeRoot?: string
  }) => {
    dataFile: string
    settings: {
      language: string
      lastLoadedAt: string | null
      lastLoadSource: string | null
      theme: string
    }
    settingsFile: string
    usageData: {
      daily: Array<{ date: string; modelsUsed: string[] }>
      totals: {
        requestCount: number
        totalCost: number
        totalTokens: number
      }
    }
  }
  isChildProcessRunning: (childProcess: {
    exitCode: number | null
    killed?: boolean
    signalCode: string | null
  }) => boolean
  waitForServer: (
    url: string,
    options: {
      authSession?: { authorizationHeader?: string } | null
      fetchImpl?: typeof fetch
      pollMs?: number
      sleepImpl?: (ms: number) => Promise<void>
      timeoutMs?: number
    },
  ) => Promise<{ authorizationHeader: string; bootstrapUrl: string } | null>
  stopServer: (
    server: EventEmitter & {
      exitCode: number | null
      kill: (signal: string) => boolean
      killed?: boolean
      signalCode: string | null
    },
    options?: { shutdownGraceMs?: number },
  ) => Promise<void>
}

const tempDirs: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  vi.useRealTimers()

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function createTempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'ttdash-screenshots-'))
  tempDirs.push(dir)
  return dir
}

function createSampleUsage() {
  return {
    daily: [
      {
        date: '2026-04-01',
        inputTokens: 1,
        outputTokens: 2,
        cacheCreationTokens: 3,
        cacheReadTokens: 4,
        thinkingTokens: 5,
        totalCost: 1.25,
        requestCount: 2,
        modelBreakdowns: [
          {
            modelName: 'GPT-Test',
            inputTokens: 1,
            outputTokens: 2,
            cacheCreationTokens: 3,
            cacheReadTokens: 4,
            thinkingTokens: 5,
            cost: 1.25,
            requestCount: 2,
          },
        ],
      },
    ],
  }
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown
}

describe('README screenshot script helpers', () => {
  it('creates deterministic local auth session metadata for the screenshot server', () => {
    const token = 'local-token-12345678901234567890'

    expect(createScreenshotAuthSession('http://127.0.0.1:3018', token)).toEqual({
      authorizationHeader: `Bearer ${token}`,
      bootstrapUrl: `http://127.0.0.1:3018/?ttdash_token=${token}`,
    })
  })

  it('uses the deterministic auth header while polling the protected usage API', async () => {
    const fetchImpl = vi.fn(async (_url: string, options?: RequestInit) => {
      const authorization = new Headers(options?.headers).get('Authorization')
      return new Response('{}', {
        status: authorization === 'Bearer local-token' ? 200 : 401,
      })
    }) as typeof fetch
    const authSession = {
      authorizationHeader: 'Bearer local-token',
      bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
    }

    await expect(
      waitForServer('http://127.0.0.1:3018', {
        authSession,
        fetchImpl,
        pollMs: 0,
        sleepImpl: async () => {},
        timeoutMs: 1000,
      }),
    ).resolves.toEqual(authSession)

    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3018/api/usage', {
      headers: { Authorization: 'Bearer local-token' },
      signal: expect.any(AbortSignal),
    })
  })

  it('caps polling sleeps to the remaining server wait budget', async () => {
    let currentTimeMs = 0
    vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs)

    const fetchImpl = vi.fn(async (_url: string, options?: RequestInit) => {
      expect(options?.signal).toBeInstanceOf(AbortSignal)
      currentTimeMs = 900
      return new Response('{}', { status: 401 })
    }) as typeof fetch
    const sleepImpl = vi.fn(async (ms: number) => {
      currentTimeMs += ms
    })

    await expect(
      waitForServer('http://127.0.0.1:3018', {
        authSession: {
          authorizationHeader: 'Bearer local-token',
          bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
        },
        fetchImpl,
        pollMs: 250,
        sleepImpl,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow('Timed out waiting for screenshot server: http://127.0.0.1:3018')

    expect(sleepImpl).toHaveBeenCalledWith(100)
  })

  it('aborts in-flight readiness requests when the server wait budget expires', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetchImpl = vi.fn((_url: string, options?: RequestInit) => {
      signal = options?.signal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        })
      })
    }) as unknown as typeof fetch

    const waitPromise = waitForServer('http://127.0.0.1:3018', {
      authSession: {
        authorizationHeader: 'Bearer local-token',
        bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
      },
      fetchImpl,
      pollMs: 10,
      sleepImpl: async () => {},
      timeoutMs: 50,
    })
    const assertion = expect(waitPromise).rejects.toThrow(
      'Timed out waiting for screenshot server: http://127.0.0.1:3018',
    )

    await vi.advanceTimersByTimeAsync(50)

    await assertion
    expect(signal?.aborted).toBe(true)
  })

  it('omits auth headers until a local auth session exists', () => {
    expect(createAuthHeaders(null)).toBeUndefined()
    expect(createAuthHeaders({ authorizationHeader: '' })).toBeUndefined()
  })

  it('seeds normalized sample usage into the isolated screenshot runtime', async () => {
    const runtimeRoot = await createTempDir()
    const sampleUsageFile = path.join(runtimeRoot, 'sample-usage.json')
    await writeFile(sampleUsageFile, JSON.stringify(createSampleUsage()))

    const result = seedSampleUsageFile({
      loadedAt: '2026-05-05T12:00:00.000Z',
      runtimeRoot,
      sampleUsageFile,
    })

    const usageData = (await readJson(path.join(runtimeRoot, 'data', 'data.json'))) as {
      daily: Array<{ modelsUsed: string[] }>
      totals: { requestCount: number; totalCost: number; totalTokens: number }
    }
    const settings = (await readJson(path.join(runtimeRoot, 'config', 'settings.json'))) as {
      language: string
      lastLoadedAt: string | null
      lastLoadSource: string | null
      theme: string
    }

    expect(result.dataFile).toBe(path.join(runtimeRoot, 'data', 'data.json'))
    expect(result.settingsFile).toBe(path.join(runtimeRoot, 'config', 'settings.json'))
    expect(usageData.daily[0]?.modelsUsed).toEqual(['GPT-Test'])
    expect(usageData.totals).toMatchObject({
      requestCount: 2,
      totalCost: 1.25,
      totalTokens: 15,
    })
    expect(settings).toMatchObject({
      language: 'de',
      lastLoadedAt: '2026-05-05T12:00:00.000Z',
      lastLoadSource: 'file',
      theme: 'dark',
    })
  })

  it('rejects invalid sample usage before writing screenshot runtime data', async () => {
    const runtimeRoot = await createTempDir()

    expect(() =>
      seedSampleUsageFile({
        runtimeRoot,
        sampleUsage: { invalid: true },
      }),
    ).toThrow('Failed to normalize README screenshot sample usage data')
  })

  it('closes browser resources even when one close operation fails', async () => {
    const context = {
      close: vi.fn(async () => {
        throw new Error('context close failed')
      }),
    }
    const browser = {
      close: vi.fn(async () => {}),
    }

    await expect(closeBrowserResources(context, browser)).resolves.toBeUndefined()

    expect(context.close).toHaveBeenCalledTimes(1)
    expect(browser.close).toHaveBeenCalledTimes(1)
  })

  it('stops only live screenshot server child processes', async () => {
    const runningServer = Object.assign(new EventEmitter(), {
      exitCode: null,
      kill: vi.fn(() => {
        runningServer.emit('close')
        return true
      }),
      killed: false,
      signalCode: null,
    })
    const closedServer = Object.assign(new EventEmitter(), {
      exitCode: 0,
      kill: vi.fn(() => true),
      killed: false,
      signalCode: null,
    })

    expect(isChildProcessRunning(runningServer)).toBe(true)
    expect(isChildProcessRunning(closedServer)).toBe(false)

    await stopServer(runningServer)
    await stopServer(closedServer)

    expect(runningServer.kill).toHaveBeenCalledWith('SIGTERM')
    expect(closedServer.kill).not.toHaveBeenCalled()
  })

  it('escalates screenshot server shutdown after the grace period', async () => {
    vi.useFakeTimers()
    const runningServer = Object.assign(new EventEmitter(), {
      exitCode: null,
      kill: vi.fn((signal: string) => {
        if (signal === 'SIGKILL') {
          runningServer.signalCode = 'SIGKILL'
        }
        return true
      }),
      killed: false,
      signalCode: null as string | null,
    })

    const stopPromise = stopServer(runningServer, { shutdownGraceMs: 50 })

    expect(runningServer.kill).toHaveBeenCalledWith('SIGTERM')
    await vi.advanceTimersByTimeAsync(50)
    await expect(stopPromise).resolves.toBeUndefined()

    expect(runningServer.kill).toHaveBeenCalledWith('SIGKILL')
    expect(runningServer.listenerCount('close')).toBe(0)
    expect(runningServer.listenerCount('error')).toBe(0)
  })
})
