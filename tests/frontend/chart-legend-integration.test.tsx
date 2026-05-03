// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartLegend } from '@/components/charts/ChartLegend'

describe('ChartLegend', () => {
  it('wraps legend labels instead of relying on horizontal scroll', () => {
    const { container } = render(
      <ChartLegend
        payload={[
          { value: 'GPT-5.4 ($60)', color: 'hsl(40 70% 50%)' },
          { value: 'Claude Sonnet 4.5 ($25)', color: 'hsl(80 70% 50%)' },
        ]}
      />,
    )

    expect(screen.getByText('GPT-5.4 ($60)')).toBeInTheDocument()
    expect(screen.getByText('Claude Sonnet 4.5 ($25)')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })

  it('keeps custom rendered labels in the wrapped legend layout', () => {
    const { container } = render(
      <ChartLegend
        payload={[
          { value: 'Cache Write', color: 'hsl(120 70% 50%)' },
          { value: 'Cache Read', color: 'hsl(160 70% 50%)' },
        ]}
        renderLabel={(entry) => `${entry.value} token type`}
      />,
    )

    expect(screen.getByText('Cache Write token type')).toBeInTheDocument()
    expect(screen.getByText('Cache Read token type')).toBeInTheDocument()
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })

  it('filters hidden entries before rendering the wrapped payload', () => {
    render(
      <ChartLegend
        payload={[
          { value: 'Visible model', color: 'hsl(200 70% 50%)' },
          { value: 'Hidden model', color: 'hsl(240 70% 50%)' },
        ]}
        filterEntry={(entry) => entry.value !== 'Hidden model'}
      />,
    )

    expect(screen.getByText('Visible model')).toBeInTheDocument()
    expect(screen.queryByText('Hidden model')).not.toBeInTheDocument()
  })
})
