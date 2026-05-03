// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { tokenData } from './lazy-dashboard-chart-test-utils'
import { TokensOverTime } from '@/components/charts/TokensOverTime'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('TokensOverTime chart', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders token totals, moving averages, and drilldown clicks', () => {
    const onClickDay = vi.fn()

    renderWithTooltip(<TokensOverTime data={tokenData} onClickDay={onClickDay} />)

    expect(screen.getByText('Tokens over time')).toBeInTheDocument()
    expect(screen.getByText('Cache tokens')).toBeInTheDocument()
    expect(screen.getByText('Input / Output tokens')).toBeInTheDocument()
    expect(screen.getByText('Thinking tokens')).toBeInTheDocument()
    expect(screen.getByText('Total tokens (all types)')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-area')).toHaveLength(6)
    expect(screen.getAllByTestId('chart-line')).toHaveLength(6)

    fireEvent.click(screen.getAllByTestId('composed-chart')[0])

    expect(onClickDay).toHaveBeenCalledWith('2026-04-01')
  })
})
