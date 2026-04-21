// @vitest-environment jsdom

import { screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { buildDetailedDayFixture, renderDrillDownModal } from './drill-down-modal-test-helpers'

describe('DrillDownModal content', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('renders model and provider deep-dive metrics for a selected day', () => {
    const { previousDay, selectedDay } = buildDetailedDayFixture()

    renderDrillDownModal({
      day: selectedDay,
      contextData: [previousDay, selectedDay],
      hasPrevious: true,
      hasNext: false,
      currentIndex: 2,
      totalCount: 2,
    })

    expect(
      screen.getByText(
        'Detailed day view with benchmarks, model breakdown, provider summary, and token distribution.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Active providers')).toBeInTheDocument()
    expect(screen.getByText('Model breakdown')).toBeInTheDocument()
    expect(screen.getByText('Provider summary')).toBeInTheDocument()
    expect(screen.getByText('Top 3 cost share')).toBeInTheDocument()
    expect(screen.getByText('Cost vs. previous')).toBeInTheDocument()
    expect(screen.getByText('Tokens vs. 1D avg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('Use ← / →')).toBeInTheDocument()

    const modelSection = screen.getByText('Model breakdown').closest('section')
    expect(modelSection).not.toBeNull()
    if (!modelSection) throw new Error('Expected model section')

    const gptCard = within(modelSection).getAllByText('GPT-5.4').at(-1)?.closest('div.rounded-xl')
    expect(gptCard).not.toBeNull()
    if (!gptCard) throw new Error('Expected GPT-5.4 card')
    expect(within(gptCard).getByText('Cost share')).toBeInTheDocument()
    expect(within(gptCard).getByText('64.3%')).toBeInTheDocument()
    expect(within(gptCard).getByText('Token share')).toBeInTheDocument()
    expect(within(gptCard).getByText('63.6%')).toBeInTheDocument()
    expect(within(gptCard).getByText('700')).toBeInTheDocument()
    expect(within(gptCard).getByText('Input')).toBeInTheDocument()
    expect(within(gptCard).getByText('450')).toBeInTheDocument()

    const providerSection = screen.getByText('Provider summary').closest('section')
    expect(providerSection).not.toBeNull()
    if (!providerSection) throw new Error('Expected provider section')

    const openAiProviderCard = within(providerSection).getByText('OpenAI').closest('div.rounded-xl')
    expect(openAiProviderCard).not.toBeNull()
    if (!openAiProviderCard) throw new Error('Expected OpenAI provider card')
    expect(within(openAiProviderCard).getByText('1 active model')).toBeInTheDocument()
    expect(within(openAiProviderCard).getByLabelText('$18.00')).toBeInTheDocument()
    expect(within(openAiProviderCard).getAllByText('6').length).toBeGreaterThan(0)

    expect(screen.getByLabelText(/^Input: /)).toBeInTheDocument()
  }, 15_000)

  it('shows unavailable request ranking and top request model when request counts are missing', () => {
    const selectedDay: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 700,
      outputTokens: 230,
      cacheCreationTokens: 40,
      cacheReadTokens: 80,
      thinkingTokens: 50,
      totalTokens: 1000,
      totalCost: 28,
      requestCount: 0,
      modelsUsed: ['gpt-5.4', 'claude-opus-4.1'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 450,
          outputTokens: 150,
          cacheCreationTokens: 20,
          cacheReadTokens: 40,
          thinkingTokens: 40,
          cost: 18,
          requestCount: 0,
        },
        {
          modelName: 'claude-opus-4.1',
          inputTokens: 250,
          outputTokens: 80,
          cacheCreationTokens: 20,
          cacheReadTokens: 40,
          thinkingTokens: 10,
          cost: 10,
          requestCount: 0,
        },
      ],
    }

    renderDrillDownModal({ day: selectedDay })

    expect(screen.getByText('Request rank').closest('div.rounded-lg')).toHaveTextContent('–')
    expect(screen.getByText('Top by requests').closest('div.rounded-lg')).toHaveTextContent('–')
  })
})
