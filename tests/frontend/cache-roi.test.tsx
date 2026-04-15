// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheROI } from '@/components/features/cache-roi/CacheROI'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

describe('CacheROI', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals()
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

    const { container } = render(
      <TooltipProvider>
        <CacheROI data={data} />
      </TooltipProvider>,
    )

    const savingsValue = screen.getByText('Savings').nextElementSibling as HTMLElement
    expect(savingsValue).toHaveClass('text-rose-700')

    const withCacheRow = screen.getByText('With cache').parentElement
    const withCacheBar = withCacheRow?.querySelector('[style*="width: 100%"]') as HTMLElement | null
    expect(withCacheBar).not.toBeNull()
    expect(withCacheBar?.className).toContain('bg-rose-500/60')
    expect(container.querySelector('[style*="width: 120%"]')).toBeNull()
  })
})
