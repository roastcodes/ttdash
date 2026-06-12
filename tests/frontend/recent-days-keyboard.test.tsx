// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { RecentDays } from '@/components/tables/RecentDays'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

describe('recent-days keyboard interactions', () => {
  beforeAll(async () => {
    await initI18n('en')
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

    const interactiveRow = within(screen.getByRole('table')).getByRole('button', {
      name: /Thu, 04\/02\/2026/,
    })
    expect(interactiveRow).toBeInTheDocument()

    expect(interactiveRow).toHaveAttribute('role', 'button')
    expect(interactiveRow).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(interactiveRow, { key: 'Enter' })
    fireEvent.keyDown(interactiveRow, { key: ' ' })

    expect(onClickDay).toHaveBeenNthCalledWith(1, '2026-04-02')
    expect(onClickDay).toHaveBeenNthCalledWith(2, '2026-04-02')
  })
})
