// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { RecentDays } from '@/components/tables/RecentDays'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('sortable recent-days table', () => {
  beforeAll(async () => {
    await initI18n('en')
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

  it('supports keyboard row activation for clickable recent-days rows', () => {
    const onClickDay = vi.fn()

    renderWithTooltip(
      <RecentDays
        onClickDay={onClickDay}
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
                modelName: 'openai/gpt-5.4',
                cost: 1,
                inputTokens: 50,
                outputTokens: 50,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                thinkingTokens: 0,
                requestCount: 1,
              },
              {
                modelName: 'claude-sonnet-4-5',
                cost: 1,
                inputTokens: 50,
                outputTokens: 50,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                thinkingTokens: 0,
                requestCount: 1,
              },
            ],
          },
        ]}
      />,
    )

    const interactiveRow = screen.getAllByText('Thu, 04/02/2026').at(-1)?.closest('tr')
    expect(interactiveRow).not.toBeNull()
    if (!interactiveRow) {
      throw new Error('Expected interactive recent-days row')
    }

    expect(interactiveRow).toHaveAttribute('role', 'button')
    expect(interactiveRow).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(interactiveRow, { key: 'Enter' })
    fireEvent.keyDown(interactiveRow, { key: ' ' })

    expect(onClickDay).toHaveBeenNthCalledWith(1, '2026-04-02')
    expect(onClickDay).toHaveBeenNthCalledWith(2, '2026-04-02')
  })
})
