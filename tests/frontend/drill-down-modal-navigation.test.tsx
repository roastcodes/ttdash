// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { renderDrillDownModal } from './drill-down-modal-test-helpers'

describe('DrillDownModal navigation', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('supports previous/next buttons and arrow-key navigation', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 100,
      totalCost: 5,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 60,
          outputTokens: 20,
          cacheCreationTokens: 10,
          cacheReadTokens: 10,
          thinkingTokens: 0,
          cost: 5,
          requestCount: 2,
        },
      ],
    }

    renderDrillDownModal({
      day,
      hasPrevious: true,
      hasNext: true,
      currentIndex: 3,
      totalCount: 8,
      onPrevious,
      onNext,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    fireEvent.keyDown(dialog, { key: 'ArrowRight', shiftKey: true })

    expect(onPrevious).toHaveBeenCalledTimes(2)
    expect(onNext).toHaveBeenCalledTimes(2)
  })
})
