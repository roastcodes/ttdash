// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/formatters'
import i18n, { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

function buildDailyUsage(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return {
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
    ...overrides,
  }
}

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
    const day = buildDailyUsage()

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

    expect(screen.getByRole('grid', { name: 'Cost heatmap' })).toHaveAttribute('aria-rowcount', '7')
    const cell = screen.getByRole('gridcell', { name: `${dateLabel}: ${formatCurrency(5)}` })

    expect(cell).toHaveAttribute('tabindex', '0')
    fireEvent.focus(cell)
    expect(await screen.findByText(formatCurrency(5))).toBeInTheDocument()
  })

  it('updates weekday and aria labels when the language changes at runtime', async () => {
    const day = buildDailyUsage()

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
      buildDailyUsage({ date: '2026-04-06', totalCost: 3 }),
      buildDailyUsage({
        date: '2026-04-07',
        inputTokens: 12,
        outputTokens: 6,
        totalTokens: 18,
        totalCost: 4,
        requestCount: 3,
      }),
      buildDailyUsage({
        date: '2026-04-13',
        inputTokens: 14,
        outputTokens: 7,
        totalTokens: 21,
        totalCost: 6,
        requestCount: 4,
      }),
      buildDailyUsage({
        date: '2026-04-14',
        inputTokens: 16,
        outputTokens: 8,
        totalTokens: 24,
        totalCost: 7,
        requestCount: 5,
      }),
    ]

    render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={days} metric="cost" />
      </TooltipProvider>,
    )

    expect(screen.getAllByRole('row')).toHaveLength(7)
    const tabbableCells = document.querySelectorAll('[role="gridcell"][tabindex="0"]')
    expect(tabbableCells).toHaveLength(1)

    const mondayFirstWeek = screen.getByRole('gridcell', { name: /April 6, 2026/ })
    fireEvent.focus(mondayFirstWeek)
    fireEvent.keyDown(mondayFirstWeek, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /April 13, 2026/ })).toHaveFocus()
    })

    const mondaySecondWeek = screen.getByRole('gridcell', { name: /April 13, 2026/ })
    fireEvent.keyDown(mondaySecondWeek, { key: 'ArrowDown' })

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /April 14, 2026/ })).toHaveFocus()
    })

    const tuesdaySecondWeek = screen.getByRole('gridcell', { name: /April 14, 2026/ })
    fireEvent.keyDown(tuesdaySecondWeek, { key: 'Home' })

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /April 7, 2026/ })).toHaveFocus()
    })

    const tuesdayFirstWeek = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    fireEvent.keyDown(tuesdayFirstWeek, { key: 'End' })

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: /April 14, 2026/ })).toHaveFocus()
    })
  })

  it('uses muted styling for zero-value cells so empty days do not dominate the heatmap', () => {
    const day = buildDailyUsage({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      modelsUsed: [],
    })

    render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" />
      </TooltipProvider>,
    )

    const cell = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    expect(cell).toHaveAttribute('fill', 'hsl(var(--muted))')
  })

  it('updates theme-dependent cell colors immediately when the theme prop changes', () => {
    const day = buildDailyUsage()

    const { rerender } = render(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" isDark={false} />
      </TooltipProvider>,
    )

    const cell = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    const lightFill = cell.getAttribute('fill')

    rerender(
      <TooltipProvider delayDuration={0}>
        <HeatmapCalendar data={[day]} metric="cost" isDark={true} />
      </TooltipProvider>,
    )

    expect(screen.getByRole('gridcell', { name: /April 7, 2026/ }).getAttribute('fill')).not.toBe(
      lightFill,
    )
  })
})
