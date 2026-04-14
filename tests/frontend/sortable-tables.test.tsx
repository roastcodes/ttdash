// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModelEfficiency } from '@/components/tables/ModelEfficiency'
import { ProviderEfficiency } from '@/components/tables/ProviderEfficiency'
import { RecentDays } from '@/components/tables/RecentDays'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

function renderWithProviders(ui: React.ReactNode) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('sortable tables', () => {
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

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
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

  it('updates aria-sort when recent days headers are toggled', () => {
    renderWithProviders(
      <RecentDays
        data={[
          {
            date: '2026-04-02',
            totalCost: 2,
            totalTokens: 200,
            inputTokens: 100,
            outputTokens: 100,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            requestCount: 2,
            modelsUsed: ['GPT-5.4'],
            modelBreakdowns: [
              {
                modelName: 'gpt-5.4',
                cost: 2,
                inputTokens: 100,
                outputTokens: 100,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                thinkingTokens: 0,
                requestCount: 2,
              },
            ],
          },
          {
            date: '2026-04-01',
            totalCost: 5,
            totalTokens: 500,
            inputTokens: 250,
            outputTokens: 250,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            requestCount: 4,
            modelsUsed: ['Sonnet 4.6'],
            modelBreakdowns: [
              {
                modelName: 'claude-sonnet-4-6',
                cost: 5,
                inputTokens: 250,
                outputTokens: 250,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                thinkingTokens: 0,
                requestCount: 4,
              },
            ],
          },
        ]}
      />,
    )

    const dateHeader = screen.getByRole('columnheader', { name: /date/i })
    const costHeader = screen.getByRole('columnheader', { name: /^cost$/i })

    expect(dateHeader).toHaveAttribute('aria-sort', 'descending')
    expect(costHeader).toHaveAttribute('aria-sort', 'none')

    fireEvent.click(within(costHeader).getByRole('button', { name: /^cost$/i }))
    expect(costHeader).toHaveAttribute('aria-sort', 'descending')

    fireEvent.click(within(costHeader).getByRole('button', { name: /^cost$/i }))
    expect(costHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it('reveals all recent days progressively without losing access to later rows', async () => {
    const days = Array.from({ length: 31 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 3, index + 1)).toISOString().slice(0, 10)

      return {
        date,
        totalCost: index + 1,
        totalTokens: (index + 1) * 100,
        inputTokens: (index + 1) * 60,
        outputTokens: (index + 1) * 40,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        requestCount: index + 1,
        modelsUsed: ['GPT-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            cost: index + 1,
            inputTokens: (index + 1) * 60,
            outputTokens: (index + 1) * 40,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            requestCount: index + 1,
          },
        ],
      }
    })

    renderWithProviders(<RecentDays data={days} />)

    fireEvent.click(screen.getByRole('button', { name: /show all/i }))

    expect(screen.getByText('Showing 31 of 31 days')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
  }, 15000)
})
