// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/formatters'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

describe('HeatmapCalendar', () => {
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

  it('exposes daily cells with keyboard-accessible labels and focus details', () => {
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 15,
      totalCost: 5,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
    }

    const dateLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date('2026-04-07T00:00:00'))

    render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" />
      </TooltipProvider>,
    )

    const cell = screen.getByRole('img', { name: `${dateLabel}: ${formatCurrency(5)}` })

    expect(cell).toHaveAttribute('tabindex', '0')
    fireEvent.focus(cell)
    expect(screen.getByText(formatCurrency(5))).toBeInTheDocument()
  })
})
