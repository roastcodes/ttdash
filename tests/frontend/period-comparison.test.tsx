// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { createDailyUsage } from './lazy-dashboard-chart-test-utils'
import { PeriodComparison } from '@/components/features/comparison/PeriodComparison'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

const DAYS_FOR_COMPARISON = 14

function buildComparisonData() {
  return Array.from({ length: DAYS_FOR_COMPARISON }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return createDailyUsage(`2026-04-${day}`, {
      claudeCost: index + 1,
      gptCost: index + 2,
    })
  })
}

describe('PeriodComparison chart', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders empty state when data is insufficient', () => {
    renderWithTooltip(<PeriodComparison data={buildComparisonData().slice(0, 3)} />)

    expect(screen.getByText('Not enough data for a comparison')).toBeInTheDocument()
    expect(screen.getByText('At least 7 days required (currently: 3)')).toBeInTheDocument()
  })

  it('renders populated state with week preset by default', () => {
    renderWithTooltip(<PeriodComparison data={buildComparisonData()} />)

    expect(screen.getByText('Period comparison')).toBeInTheDocument()
    expect(screen.getByText('Last week')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('switches to month preset when Month button is clicked', () => {
    renderWithTooltip(<PeriodComparison data={buildComparisonData()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Month' }))

    expect(screen.getByText('Last month')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
  })
})
