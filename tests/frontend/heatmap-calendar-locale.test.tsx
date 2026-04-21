// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HeatmapCalendar } from '@/components/features/heatmap/HeatmapCalendar'
import i18n, { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'
import { buildDailyUsage } from './heatmap-calendar-test-helpers'

describe('HeatmapCalendar locale updates', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('updates weekday and aria labels when the language changes at runtime', async () => {
    const day = buildDailyUsage()
    const { rerender } = renderWithTooltip(<HeatmapCalendar data={[day]} metric="cost" />)

    expect(screen.getByText('We')).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /April 7, 2026/ })).toBeInTheDocument()

    await i18n.changeLanguage('de')
    rerender(<HeatmapCalendar data={[day]} metric="cost" />)

    expect(await screen.findByText('Mi')).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /7\. April 2026/ })).toBeInTheDocument()
  })
})
