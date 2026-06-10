// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { CostByModel } from '@/components/charts/CostByModel'
import { formatCurrency } from '@/lib/formatters'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('CostByModel', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders a readable share breakdown for the leading slices without relying on hover', () => {
    renderWithTooltip(
      <CostByModel
        data={[
          { name: 'GPT-5.4', value: 60 },
          { name: 'Claude Sonnet 4.5', value: 25 },
          { name: 'Gemini 2.5 Pro', value: 10 },
          { name: 'Grok 4', value: 5 },
        ]}
      />,
    )

    expect(screen.getByText('GPT-5.4 · 60%')).toBeInTheDocument()
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
    expect(screen.getByText(/25% · \$25(?:\.0+)?/)).toBeInTheDocument()
    expect(screen.getByText('Other models')).toBeInTheDocument()
    expect(screen.getByText('5% · $5.00')).toBeInTheDocument()
  })

  it('keeps every model visible in a full wrapped legend when many models are present', () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      name: `Model ${String(index + 1).padStart(2, '0')}`,
      value: (index + 1) * 4,
    }))
    const { container } = renderWithTooltip(<CostByModel data={data} />)

    for (const entry of data) {
      expect(screen.getByText(`${entry.name} (${formatCurrency(entry.value)})`)).toBeInTheDocument()
    }

    expect(container.querySelector('.recharts-legend-wrapper')).toBeNull()
    expect(container.querySelector('.flex-wrap')).not.toBeNull()
  })
})
