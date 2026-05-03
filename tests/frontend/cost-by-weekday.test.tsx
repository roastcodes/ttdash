// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  assertLegacyWeekdayData,
  legacyWeekdayData,
  weekdayData,
} from './lazy-dashboard-chart-test-utils'
import { CostByWeekday } from '@/components/charts/CostByWeekday'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('CostByWeekday chart', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders peak and low bars without a browser-only chart dependency', () => {
    renderWithTooltip(<CostByWeekday data={weekdayData} />)

    expect(screen.getByText('Cost by weekday')).toBeInTheDocument()
    expect(screen.getByText('Peak: Tu · Low: Sa · Weekend 19%')).toBeInTheDocument()
    expect(screen.getByTestId('chart-bar')).toHaveAttribute('data-name', 'Avg cost')

    const fills = screen.getAllByTestId('bar-cell').map((cell) => cell.getAttribute('data-fill'))
    expect(fills).toHaveLength(7)
    expect(fills.some((fill) => fill?.includes('weekdayPeak'))).toBe(true)
    expect(fills.some((fill) => fill?.includes('weekdayLow'))).toBe(true)
  })

  it('uses localized day labels as a defensive weekend fallback without weekday indices', () => {
    assertLegacyWeekdayData(legacyWeekdayData)

    renderWithTooltip(<CostByWeekday data={legacyWeekdayData} />)

    expect(screen.getByText('Peak: Mar · Low: Sáb. · Weekend 19%')).toBeInTheDocument()
  })
})
