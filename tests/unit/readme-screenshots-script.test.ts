import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const {
  createAuthHeaders,
  createScreenshotAuthSession,
  createTrustedMutationHeaders,
  seedSampleUsage,
  waitForServer,
} = require('../../scripts/capture-readme-screenshots.js') as {
  createAuthHeaders: (authSession: { authorizationHeader?: string } | null) => HeadersInit
  createScreenshotAuthSession: (
    url?: string,
    token?: string,
  ) => {
    authorizationHeader: string
    bootstrapUrl: string
  }
  createTrustedMutationHeaders: (
    authSession: { authorizationHeader?: string } | null,
    url: string,
  ) => HeadersInit
  seedSampleUsage: (options: {
    authSession?: { authorizationHeader?: string } | null
    fetchImpl?: typeof fetch
    sampleUsage?: unknown
    url?: string
  }) => Promise<void>
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

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('builds trusted mutation headers for screenshot data seeding', () => {
    expect(
      createTrustedMutationHeaders(
        { authorizationHeader: 'Bearer local-token' },
        'http://127.0.0.1:3018',
      ),
    ).toEqual({
      Authorization: 'Bearer local-token',
      'Content-Type': 'application/json',
      Origin: 'http://127.0.0.1:3018',
    })
  })

  it('seeds sample usage through the protected upload API before screenshots', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 })) as typeof fetch
    const sampleUsage = { daily: [{ date: '2026-04-01', totalCost: 5 }] }

    await seedSampleUsage({
      authSession: { authorizationHeader: 'Bearer local-token' },
      fetchImpl,
      sampleUsage,
      url: 'http://127.0.0.1:3018',
    })

    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3018/api/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer local-token',
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3018',
      },
      body: JSON.stringify(sampleUsage),
    })
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
