// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'
import { buildDailyUsage } from './heatmap-calendar-test-helpers'

describe('HeatmapCalendar appearance', () => {
  beforeAll(async () => {
    await initI18n('en')
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

    renderWithTooltip(<HeatmapCalendar data={[day]} metric="cost" />)

    const cell = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    expect(cell).toHaveAttribute('fill', 'hsl(var(--muted))')
  })

  it('updates theme-dependent cell colors immediately when the theme prop changes', () => {
    const day = buildDailyUsage()
    const { rerender } = renderWithTooltip(
      <HeatmapCalendar data={[day]} metric="cost" isDark={false} />,
    )

    const cell = screen.getByRole('gridcell', { name: /April 7, 2026/ })
    const lightFill = cell.getAttribute('fill')

    rerender(<HeatmapCalendar data={[day]} metric="cost" isDark={true} />)

    expect(screen.getByRole('gridcell', { name: /April 7, 2026/ }).getAttribute('fill')).not.toBe(
      lightFill,
    )
  })
})
