import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
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
  vi.useRealTimers()
})

describe('rendered chart data helpers', () => {
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
    const waitForTimeout = waitFor.mock.calls[0]?.[0]?.timeout
    expect(waitForTimeout).toBeGreaterThan(0)
    expect(waitForTimeout).toBeLessThanOrEqual(1000)
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('normalizes section wait timeout errors when the chart budget expires', async () => {
    let currentTimeMs = 0
    vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs)

    const timeoutError = new Error('Timeout 1000ms exceeded')
    timeoutError.name = 'TimeoutError'
    const evaluate = vi.fn<() => Promise<number>>()
    const waitFor = vi.fn(async () => {
      currentTimeMs = 1000
      throw timeoutError
    })
    const locator = vi.fn(() => ({ evaluate, waitFor }))

    await expect(
      waitForRenderedChartData(
        { locator },
        {
          sectionSelector: '#charts',
          timeoutMs: 1000,
        },
      ),
    ).rejects.toThrow('Timed out waiting for rendered chart data in #charts')

    expect(evaluate).not.toHaveBeenCalled()
  })

  it('preserves non-timeout section wait errors after the chart budget expires', async () => {
    let currentTimeMs = 0
    vi.spyOn(Date, 'now').mockImplementation(() => currentTimeMs)

    const sectionError = new Error('Locator resolved to multiple chart sections')
    const evaluate = vi.fn<() => Promise<number>>()
    const waitFor = vi.fn(async () => {
      currentTimeMs = 1000
      throw sectionError
    })
    const locator = vi.fn(() => ({ evaluate, waitFor }))

    await expect(
      waitForRenderedChartData(
        { locator },
        {
          sectionSelector: '#charts',
          timeoutMs: 1000,
        },
      ),
    ).rejects.toBe(sectionError)

    expect(evaluate).not.toHaveBeenCalled()
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
