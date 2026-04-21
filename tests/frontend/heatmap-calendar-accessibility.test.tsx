// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import { formatCurrency } from '@/lib/formatters'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'
import { buildDailyUsage } from './heatmap-calendar-test-helpers'

describe('HeatmapCalendar accessibility', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('exposes daily cells with keyboard-accessible labels and focus details', async () => {
    const day = buildDailyUsage()
    const dateLabel = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date('2026-04-07T00:00:00'))

    renderWithTooltip(<HeatmapCalendar data={[day]} metric="cost" />)

    expect(screen.getByRole('grid', { name: 'Cost heatmap' })).toHaveAttribute('aria-rowcount', '7')
    const cell = screen.getByRole('gridcell', { name: `${dateLabel}: ${formatCurrency(5)}` })

    expect(cell).toHaveAttribute('tabindex', '0')
    fireEvent.focus(cell)
    expect(await screen.findByText(formatCurrency(5))).toBeInTheDocument()
  })

  it('keeps only one heatmap cell in the tab order and supports arrow-key navigation', async () => {
    const days = [
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

    renderWithTooltip(<HeatmapCalendar data={days} metric="cost" />)

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
  }, 15_000)
})
