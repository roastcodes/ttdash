// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { RecentDays } from '@/components/tables/RecentDays'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('sortable recent-days table', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('makes every desktop recent-days column header sortable', () => {
    renderWithTooltip(
      <RecentDays
        data={[
          {
            date: '2026-04-02',
            totalCost: 2,
            totalTokens: 200,
            inputTokens: 100,
            outputTokens: 50,
            cacheCreationTokens: 20,
            cacheReadTokens: 25,
            thinkingTokens: 5,
            requestCount: 2,
            modelsUsed: ['GPT-5.4'],
            modelBreakdowns: [
              {
                modelName: 'gpt-5.4',
                cost: 2,
                inputTokens: 100,
                outputTokens: 50,
                cacheCreationTokens: 20,
                cacheReadTokens: 25,
                thinkingTokens: 5,
                requestCount: 2,
              },
            ],
          },
          {
            date: '2026-04-01',
            totalCost: 5,
            totalTokens: 500,
            inputTokens: 250,
            outputTokens: 125,
            cacheCreationTokens: 50,
            cacheReadTokens: 60,
            thinkingTokens: 15,
            requestCount: 4,
            modelsUsed: ['Sonnet 4.6'],
            modelBreakdowns: [
              {
                modelName: 'claude-sonnet-4-6',
                cost: 5,
                inputTokens: 250,
                outputTokens: 125,
                cacheCreationTokens: 50,
                cacheReadTokens: 60,
                thinkingTokens: 15,
                requestCount: 4,
              },
            ],
          },
        ]}
      />,
    )

    const sortableHeaderNames = [
      /^cost$/i,
      /^date$/i,
      /^tokens$/i,
      /^input$/i,
      /^output$/i,
      /^cache write$/i,
      /^cache read$/i,
      /^thinking$/i,
      /^req$/i,
      /^\$\/1M$/i,
      /^models$/i,
    ]

    for (const name of sortableHeaderNames) {
      const header = screen.getByRole('columnheader', { name })
      const initialSort = header.getAttribute('aria-sort')
      fireEvent.click(within(header).getByRole('button', { name }))
      expect(header).toHaveAttribute(
        'aria-sort',
        initialSort === 'descending' ? 'ascending' : 'descending',
      )
    }
  })

  it('updates aria-sort when recent days headers are toggled', () => {
    renderWithTooltip(
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

  it('keeps rapid same-header sort toggles atomic', () => {
    renderWithTooltip(
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
            modelBreakdowns: [],
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
            modelBreakdowns: [],
          },
        ]}
      />,
    )

    const costHeader = screen.getByRole('columnheader', { name: /^cost$/i })
    const costButton = within(costHeader).getByRole('button', { name: /^cost$/i })

    fireEvent.click(costButton)
    fireEvent.click(costButton)

    expect(costHeader).toHaveAttribute('aria-sort', 'ascending')
  })
})
