// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/formatters'
import i18n, { initI18n } from '@/lib/i18n'
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

  it('exposes daily cells with keyboard-accessible labels and focus details', async () => {
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

    const cell = screen.getByRole('gridcell', { name: `${dateLabel}: ${formatCurrency(5)}` })

    expect(cell).toHaveAttribute('tabindex', '0')
    fireEvent.focus(cell)
    expect(await screen.findByText(formatCurrency(5))).toBeInTheDocument()
  })

  it('updates weekday and aria labels when the language changes at runtime', async () => {
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

    const { rerender } = render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" />
      </TooltipProvider>,
    )

    expect(screen.getByText('We')).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /April 7, 2026/ })).toBeInTheDocument()

    await i18n.changeLanguage('de')
    rerender(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" />
      </TooltipProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Mi')).toBeInTheDocument()
    })
    expect(screen.getByRole('gridcell', { name: /7\. April 2026/ })).toBeInTheDocument()
  })

  it('keeps only one heatmap cell in the tab order and supports arrow-key navigation', async () => {
    const days: DailyUsage[] = [
      {
        date: '2026-04-06',
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 15,
        totalCost: 3,
        requestCount: 2,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [],
      },
      {
        date: '2026-04-07',
        inputTokens: 12,
        outputTokens: 6,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 18,
        totalCost: 4,
        requestCount: 3,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [],
      },
    ]

    render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={days} metric="cost" />
      </TooltipProvider>,
    )

    const tabbableCells = document.querySelectorAll('[role="gridcell"][tabindex="0"]')
    expect(tabbableCells).toHaveLength(1)

    const firstDay = screen.getByRole('gridcell', { name: /April 6, 2026/ })
    fireEvent.focus(firstDay)
    fireEvent.keyDown(firstDay, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /April 7, 2026/ })).toHaveFocus()
    })
  })

  it('uses muted styling for zero-value cells so empty days do not dominate the heatmap', () => {
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      modelsUsed: [],
      modelBreakdowns: [],
    }

    render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" />
      </TooltipProvider>,
    )

    const cell = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    expect(cell).toHaveAttribute('fill', 'hsl(var(--muted))')
  })
})
