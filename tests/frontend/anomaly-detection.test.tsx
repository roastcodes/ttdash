// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnomalyDetection } from '@/components/features/anomaly/AnomalyDetection'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

vi.mock('@/lib/calculations', async () => {
  const actual = await vi.importActual('@/lib/calculations')

  return {
    ...actual,
    computeAnomalies: vi.fn((data: DailyUsage[]) =>
      data.length > 0 ? [data[data.length - 1]] : [],
    ),
  }
})

const anomalyFixture: DailyUsage[] = [
  {
    date: '2026-04-01',
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 15,
    totalCost: 5,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [],
  },
  {
    date: '2026-04-02',
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 15,
    totalCost: 6,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [],
  },
  {
    date: '2026-04-03',
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 15,
    totalCost: 25,
    requestCount: 1,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [],
  },
]

describe('AnomalyDetection', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )

    await initI18n('en')
  })

  it('disables anomaly cards when no drilldown callback is available', () => {
    render(
      <TooltipProvider>
        <AnomalyDetection data={anomalyFixture} />
      </TooltipProvider>,
    )

    const anomalyButton = screen.getByRole('button', { name: /fri, 04\/03\/2026/i })

    expect(anomalyButton).toBeDisabled()
    expect(anomalyButton).toHaveAttribute('aria-disabled', 'true')
    expect(anomalyButton).toHaveClass('focus-visible:ring-2')
    expect(anomalyButton).toHaveClass('disabled:cursor-not-allowed')
  })

  it('keeps anomaly cards interactive when a drilldown callback is available', () => {
    const onClickDay = vi.fn()

    render(
      <TooltipProvider>
        <AnomalyDetection data={anomalyFixture} onClickDay={onClickDay} />
      </TooltipProvider>,
    )

    const anomalyButton = screen.getByRole('button', { name: /fri, 04\/03\/2026/i })

    expect(anomalyButton).toBeEnabled()
    expect(anomalyButton).toHaveAttribute('aria-disabled', 'false')

    fireEvent.click(anomalyButton)

    expect(onClickDay).toHaveBeenCalledWith('2026-04-03')
  })
})
