// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { CostOverTime } from '@/components/charts/CostOverTime'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('CostOverTime', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('summarizes the latest point and peak day without reordering the source data', () => {
    const data = [
      { date: '2026-04-01', cost: 4 },
      { date: '2026-04-02', cost: 12 },
      { date: '2026-04-03', cost: 6 },
    ]

    renderWithTooltip(<CostOverTime data={data} />)

    expect(screen.getByText(/latest \$6\.00 · peak \$12\.0 on 04\/02/i)).toBeInTheDocument()
    expect(data.map((point) => point.date)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03'])
  })

  it('renders legend entries in a horizontally readable list', () => {
    const { container } = render(
      <ChartLegend
        payload={[
          { value: 'Cost', color: '#3b82f6' },
          { value: '7-day average with a much longer label', color: '#8b5cf6' },
        ]}
      />,
    )

    expect(screen.getByText('Cost')).toBeInTheDocument()
    expect(screen.getByText('7-day average with a much longer label')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })

  it('supports custom legend labels while keeping the wrap layout', () => {
    const { container } = render(
      <ChartLegend
        payload={[{ value: 'GPT-5.4', color: '#3b82f6' }]}
        renderLabel={(entry) => `${entry.value} ($42.00)`}
      />,
    )

    expect(screen.getByText('GPT-5.4 ($42.00)')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })
})
