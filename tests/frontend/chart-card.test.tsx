// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartCard } from '@/components/charts/ChartCard'
import { initI18n } from '@/lib/i18n'

describe('ChartCard', () => {
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

  it('uses localized stat labels in the expanded view', () => {
    render(
      <ChartCard
        title="Demo chart"
        chartData={[
          { date: '2026-04-01', cost: 1 },
          { date: '2026-04-02', cost: 2 },
        ]}
        valueKey="cost"
      >
        <div>Content</div>
      </ChartCard>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Demo chart expand' }))

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Data points')).toBeInTheDocument()
  })

  it('reveals the expand control for keyboard focus on desktop', () => {
    render(
      <ChartCard title="Demo chart">
        <div>Content</div>
      </ChartCard>,
    )

    const button = screen.getByRole('button', { name: 'Demo chart expand' })
    expect(button).toHaveClass('md:group-focus-within:opacity-100')
    expect(button).toHaveClass('focus-visible:opacity-100')
    expect(button).toHaveClass('motion-reduce:transition-none')
  })
})
