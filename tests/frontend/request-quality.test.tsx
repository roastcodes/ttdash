// @vitest-environment jsdom

import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestQuality } from '@/components/features/request-quality/RequestQuality'
import { initI18n } from '@/lib/i18n'
import type { DashboardMetrics } from '@/types'
import { renderWithTooltip } from '../test-utils'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          target: document.createElement('div'),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }
}

const baseMetrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  totalInput: 0,
  totalOutput: 0,
  totalCacheCreate: 0,
  totalCacheRead: 0,
  totalThinking: 0,
  totalRequests: 0,
  activeDays: 0,
  avgDailyCost: 0,
  avgTokensPerRequest: 0,
  avgCostPerRequest: 0,
  peakDay: null,
  cacheHitRate: 0,
  modelCount: 0,
  providerCount: 0,
  topModels: [],
  topRequestModel: null,
  dailyBurnRate: 0,
  requestVolatility: 0,
  providerConcentrationIndex: 0,
  topProvider: null,
  hasRequestData: false,
}

describe('RequestQuality', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps request-quality progress bars empty when request data is unavailable', () => {
    const { container } = renderWithTooltip(
      <RequestQuality metrics={baseMetrics} viewMode="daily" />,
    )

    const progressBars = container.querySelectorAll('[style*="width: 0%"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(4)
    expect(screen.getAllByText('n/a').length).toBeGreaterThanOrEqual(4)
  })

  it('keeps real zero-value metrics at 0% width even when request data exists', () => {
    const { container } = renderWithTooltip(
      <RequestQuality
        metrics={{
          ...baseMetrics,
          hasRequestData: true,
          totalRequests: 4,
          activeDays: 2,
        }}
        viewMode="daily"
      />,
    )

    const progressBars = container.querySelectorAll('[style*="width: 0%"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText('n/a')).not.toBeInTheDocument()
  })

  it('animates request-quality bars only after the metric cards become visible', async () => {
    const { container } = renderWithTooltip(
      <RequestQuality
        metrics={{
          ...baseMetrics,
          hasRequestData: true,
          totalRequests: 4,
          activeDays: 2,
          avgTokensPerRequest: 100_000,
          avgCostPerRequest: 0.125,
          totalCacheRead: 200_000,
          totalThinking: 20_000,
        }}
        viewMode="daily"
      />,
    )

    const fills = () => Array.from(container.querySelectorAll('.h-full.rounded-full'))

    expect(fills().some((fill) => Number.parseFloat((fill as HTMLElement).style.width) > 0)).toBe(
      false,
    )

    act(() => {
      MockIntersectionObserver.instances.forEach((observer) => observer.trigger(true))
    })

    await waitFor(() => {
      expect(
        fills().filter((fill) => Number.parseFloat((fill as HTMLElement).style.width) > 0).length,
      ).toBeGreaterThanOrEqual(4)
    })
  })
})
