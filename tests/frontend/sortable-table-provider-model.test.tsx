// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { ModelEfficiency } from '@/components/tables/ModelEfficiency'
import { ProviderEfficiency } from '@/components/tables/ProviderEfficiency'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

function renderWithProviders(ui: ReactNode) {
  return renderWithTooltip(<>{ui}</>)
}

describe('sortable provider and model tables', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('exposes accessible sort state for provider efficiency headers', () => {
    renderWithProviders(
      <ProviderEfficiency
        providerMetrics={
          new Map([
            ['OpenAI', { cost: 10, tokens: 1000, requests: 5, cacheRead: 200, days: 2 }],
            ['Anthropic', { cost: 5, tokens: 500, requests: 2, cacheRead: 50, days: 1 }],
          ])
        }
        totalCost={15}
      />,
    )

    const costButton = screen.getByRole('button', { name: /^cost$/i })
    const requestsButton = screen.getByRole('button', { name: /^req$/i })
    const costHeader = costButton.closest('th')
    const requestsHeader = requestsButton.closest('th')

    expect(costHeader).toHaveAttribute('aria-sort', 'descending')
    expect(costButton).toBeInTheDocument()
    expect(requestsHeader).toHaveAttribute('aria-sort', 'none')

    fireEvent.click(requestsButton)
    expect(screen.getByRole('button', { name: /^req$/i }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('renders model efficiency sort controls as buttons inside column headers', () => {
    renderWithProviders(
      <ModelEfficiency
        modelCosts={
          new Map([
            ['GPT-5.4', { cost: 10, tokens: 1000, requests: 5, days: 2 }],
            ['Sonnet 4.6', { cost: 5, tokens: 500, requests: 2, days: 1 }],
          ])
        }
        totalCost={15}
      />,
    )

    const costButton = screen.getByRole('button', { name: /^cost$/i })
    const tokensButton = screen.getByRole('button', { name: /^tokens$/i })
    const costHeader = costButton.closest('th')

    expect(costHeader).toHaveAttribute('aria-sort', 'descending')
    expect(costButton).toBeInTheDocument()

    fireEvent.click(tokensButton)
    expect(screen.getByRole('button', { name: /^tokens$/i }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })
})
