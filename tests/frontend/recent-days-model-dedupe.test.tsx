// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import type * as ModelUtilsModule from '@/lib/model-utils'

describe('RecentDays model deduplication', () => {
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
    vi.doUnmock('@/lib/model-utils')
    vi.resetModules()
  })

  it('keeps entries with the same normalized name when their providers differ', async () => {
    vi.doMock('@/lib/model-utils', async () => {
      const actual = await vi.importActual<ModelUtilsModule>('@/lib/model-utils')

      return {
        ...actual,
        normalizeModelName: () => 'Shared Model',
        getModelProvider: (raw: string) => (raw.includes('openai') ? 'OpenAI' : 'Anthropic'),
      }
    })

    const { RecentDays } = await import('@/components/tables/RecentDays')

    const data: DailyUsage[] = [
      {
        date: '2026-04-02',
        totalCost: 2,
        totalTokens: 200,
        inputTokens: 100,
        outputTokens: 100,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        requestCount: 2,
        modelsUsed: ['Shared Model'],
        modelBreakdowns: [
          {
            modelName: 'openai/shared-model',
            cost: 1,
            inputTokens: 50,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            requestCount: 1,
          },
          {
            modelName: 'anthropic/shared-model',
            cost: 1,
            inputTokens: 50,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            requestCount: 1,
          },
        ],
      },
    ]

    render(
      <TooltipProvider>
        <RecentDays data={data} />
      </TooltipProvider>,
    )

    expect(screen.getAllByText('Shared Model').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Anthropic').length).toBeGreaterThanOrEqual(1)
  })
})
