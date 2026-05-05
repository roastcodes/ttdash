import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createAuthHeaders, createScreenshotAuthSession, seedSampleUsageFile, waitForServer } =
  require('../../scripts/capture-readme-screenshots.js') as {
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
  }
const { renderedChartDataSelector, waitForRenderedChartData } =
  require('../../scripts/rendered-chart-data.js') as {
    renderedChartDataSelector: string
    waitForRenderedChartData: (
      page: {
        locator: (selector: string) => {
          evaluate: () => Promise<number>
          waitFor: (options?: { timeout?: number }) => Promise<void>
        }
      },
      options?: {
        minShapes?: number
        pollMs?: number
        sectionSelector?: string
        sleepImpl?: (ms: number) => Promise<void>
        timeoutMs?: number
      },
    ) => Promise<void>
  }

const tempDirs: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()

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
    })
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

  it('waits for rendered chart data shapes before capturing analytics screenshots', async () => {
    const evaluate = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(4)
    const waitFor = vi.fn(async () => {})
    const locator = vi.fn(() => ({ evaluate, waitFor }))

    await waitForRenderedChartData(
      { locator },
      {
        minShapes: 3,
        pollMs: 0,
        sectionSelector: '#charts',
        sleepImpl: async () => {},
        timeoutMs: 1000,
      },
    )

    expect(renderedChartDataSelector).toContain('recharts-line-curve')
    expect(locator).toHaveBeenCalledWith('#charts')
    expect(waitFor).toHaveBeenCalledWith({ timeout: 1000 })
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('uses one shared timeout budget while waiting for chart data', async () => {
    let currentTimeMs = 0
    vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs)

    const evaluate = vi.fn<() => Promise<number>>().mockResolvedValue(0)
    const waitFor = vi.fn(async () => {
      currentTimeMs = 800
    })
    const locator = vi.fn(() => ({ evaluate, waitFor }))
    const sleepImpl = vi.fn(async (ms: number) => {
      currentTimeMs += ms
    })

    await expect(
      waitForRenderedChartData(
        { locator },
        {
          minShapes: 3,
          pollMs: 250,
          sectionSelector: '#charts',
          sleepImpl,
          timeoutMs: 1000,
        },
      ),
    ).rejects.toThrow('Timed out waiting for rendered chart data in #charts')

    expect(waitFor).toHaveBeenCalledWith({ timeout: 1000 })
    expect(evaluate).toHaveBeenCalledTimes(1)
    expect(sleepImpl).toHaveBeenCalledWith(200)
  })
})
