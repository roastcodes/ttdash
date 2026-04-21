// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { CacheROI } from '@/components/features/cache-roi/CacheROI'
import { getCurrentLanguage, initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { renderWithTooltip } from '../test-utils'

vi.mock('@/components/ui/AnimatedBarFill', () => ({
  AnimatedBarFill: ({
    width,
    className,
    order,
    delayMs,
    durationMs,
    style,
  }: {
    width: string
    className?: string
    order?: number
    delayMs?: number
    durationMs?: number
    style?: React.CSSProperties
  }) => (
    <div
      data-testid="animated-bar-fill"
      data-width={width}
      data-order={order === undefined ? '' : String(order)}
      data-delay-ms={delayMs === undefined ? '' : String(delayMs)}
      data-duration-ms={durationMs === undefined ? '' : String(durationMs)}
      className={className}
      style={style}
    />
  ),
}))

describe('CacheROI', () => {
  let previousLanguage = getCurrentLanguage()

  beforeAll(async () => {
    previousLanguage = getCurrentLanguage()
    await initI18n('en')
  })

  afterAll(async () => {
    await initI18n(previousLanguage)
  })

  it('treats negative savings as a loss and clamps the comparison bar width', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-07',
        inputTokens: 100,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 100,
        totalCost: 20,
        requestCount: 2,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 100,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 10,
            requestCount: 2,
          },
        ],
      },
    ]

    const { container } = renderWithTooltip(<CacheROI data={data} />)

    const savingsValue = screen.getByText('Savings').nextElementSibling as HTMLElement
    expect(savingsValue).toHaveClass('text-rose-700')

    const withCacheRow = screen.getByText('With cache').parentElement
    const withCacheBar = withCacheRow?.querySelector('.bg-rose-500\\/60') as HTMLElement | null
    expect(withCacheBar).not.toBeNull()
    expect(withCacheBar?.className).toContain('bg-rose-500/60')
    expect(container.querySelector('[style*="width: 120%"]')).toBeNull()
  })

  it('animates both the paid and saved comparison segments through AnimatedBarFill', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-07',
        inputTokens: 100,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 1_000_000,
        thinkingTokens: 0,
        totalTokens: 1_000_100,
        totalCost: 2,
        requestCount: 2,
        modelsUsed: ['mystery-model'],
        modelBreakdowns: [
          {
            modelName: 'mystery-model',
            inputTokens: 100,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 1_000_000,
            thinkingTokens: 0,
            cost: 2,
            requestCount: 2,
          },
        ],
      },
    ]

    renderWithTooltip(<CacheROI data={data} />)

    const fills = screen.getAllByTestId('animated-bar-fill')
    expect(fills).toHaveLength(3)
    expect(fills[0]).toHaveAttribute('data-width', '100%')
    expect(fills[0]).toHaveAttribute('data-order', '0')
    const paidWidth = Number.parseFloat(fills[1].getAttribute('data-width') ?? '0')
    const savedWidth = Number.parseFloat(fills[2].getAttribute('data-width') ?? '0')
    expect(paidWidth).toBeGreaterThan(0)
    expect(fills[1]).toHaveAttribute('data-order', '0')
    expect(savedWidth).toBeGreaterThan(0)
    expect(fills[2]).toHaveAttribute('data-order', '1')
    expect(paidWidth + savedWidth).toBeCloseTo(100, 5)
  })
})
