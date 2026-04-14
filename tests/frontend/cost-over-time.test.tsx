// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { CostOverTime } from '@/components/charts/CostOverTime'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

describe('CostOverTime', () => {
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

  it('summarizes the latest point and peak day without reordering the source data', () => {
    const data = [
      { date: '2026-04-01', cost: 4 },
      { date: '2026-04-02', cost: 12 },
      { date: '2026-04-03', cost: 6 },
    ]

    render(
      <TooltipProvider>
        <CostOverTime data={data} />
      </TooltipProvider>,
    )

    expect(screen.getByText(/latest \$6\.00 · peak \$12\.0 on 04\/02/i)).toBeInTheDocument()
    expect(data.map((point) => point.date)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03'])
  })

  it('renders legend entries in a horizontally readable list', () => {
    render(
      <ChartLegend
        payload={[
          { value: 'Cost', color: '#3b82f6' },
          { value: '7-day avg', color: '#8b5cf6' },
        ]}
      />,
    )

    expect(screen.getByText('Cost')).toBeInTheDocument()
    expect(screen.getByText('7-day avg')).toBeInTheDocument()
  })
})
