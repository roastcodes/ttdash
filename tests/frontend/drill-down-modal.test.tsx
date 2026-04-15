// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'

describe('DrillDownModal', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('renders model and provider deep-dive metrics for a selected day', () => {
    const previousDay: DailyUsage = {
      date: '2026-04-06',
      inputTokens: 300,
      outputTokens: 120,
      cacheCreationTokens: 30,
      cacheReadTokens: 50,
      thinkingTokens: 0,
      totalTokens: 500,
      totalCost: 15,
      requestCount: 6,
      modelsUsed: ['gpt-5.4', 'claude-opus-4.1'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 200,
          outputTokens: 80,
          cacheCreationTokens: 20,
          cacheReadTokens: 40,
          thinkingTokens: 0,
          cost: 8,
          requestCount: 4,
        },
        {
          modelName: 'claude-opus-4.1',
          inputTokens: 100,
          outputTokens: 40,
          cacheCreationTokens: 10,
          cacheReadTokens: 10,
          thinkingTokens: 0,
          cost: 7,
          requestCount: 2,
        },
      ],
    }

    const selectedDay: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 700,
      outputTokens: 230,
      cacheCreationTokens: 40,
      cacheReadTokens: 80,
      thinkingTokens: 50,
      totalTokens: 1,
      totalCost: 28,
      requestCount: 10,
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
          requestCount: 6,
        },
        {
          modelName: 'claude-opus-4.1',
          inputTokens: 250,
          outputTokens: 80,
          cacheCreationTokens: 20,
          cacheReadTokens: 40,
          thinkingTokens: 10,
          cost: 10,
          requestCount: 4,
        },
      ],
    }

    render(
      <TooltipProvider>
        <DrillDownModal
          day={selectedDay}
          contextData={[previousDay, selectedDay]}
          open
          hasPrevious={true}
          hasNext={false}
          currentIndex={2}
          totalCount={2}
          onClose={() => {}}
        />
      </TooltipProvider>,
    )

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

  it('labels aggregated entries as periods and shows raw-day coverage', async () => {
    const monthEntry: DailyUsage = {
      date: '2026-04',
      inputTokens: 900,
      outputTokens: 300,
      cacheCreationTokens: 100,
      cacheReadTokens: 400,
      thinkingTokens: 0,
      totalTokens: 1700,
      totalCost: 42,
      requestCount: 12,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 900,
          outputTokens: 300,
          cacheCreationTokens: 100,
          cacheReadTokens: 400,
          thinkingTokens: 0,
          cost: 42,
          requestCount: 12,
        },
      ],
      _aggregatedDays: 30,
    }

    render(
      <TooltipProvider>
        <DrillDownModal
          day={monthEntry}
          contextData={[monthEntry]}
          open
          hasPrevious={false}
          hasNext={false}
          currentIndex={1}
          totalCount={1}
          onClose={() => {}}
        />
      </TooltipProvider>,
    )

    expect(
      screen.getByText(
        'Detailed month view with benchmarks, model breakdown, provider summary, and token distribution.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Type: month')).toBeInTheDocument()
    expect(screen.getAllByText('30 raw days').length).toBeGreaterThan(0)
  })

  it('uses period-aware benchmark labels for monthly and yearly drilldowns', () => {
    const monthlyEntry: DailyUsage = {
      date: '2026-04',
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 160,
      totalCost: 12,
      requestCount: 4,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [],
      _aggregatedDays: 30,
    }
    const previousMonth: DailyUsage = {
      ...monthlyEntry,
      date: '2026-03',
      totalCost: 10,
      requestCount: 3,
    }
    const yearlyEntry: DailyUsage = {
      ...monthlyEntry,
      date: '2026',
      totalCost: 120,
      requestCount: 40,
      _aggregatedDays: 365,
    }
    const previousYear: DailyUsage = {
      ...yearlyEntry,
      date: '2025',
      totalCost: 100,
      requestCount: 35,
    }

    const { rerender } = render(
      <TooltipProvider>
        <DrillDownModal
          day={monthlyEntry}
          contextData={[previousMonth, monthlyEntry]}
          open
          hasPrevious={true}
          hasNext={false}
          currentIndex={2}
          totalCount={2}
          onClose={() => {}}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('Cost vs. 1M avg')).toBeInTheDocument()

    rerender(
      <TooltipProvider>
        <DrillDownModal
          day={yearlyEntry}
          contextData={[previousYear, yearlyEntry]}
          open
          hasPrevious={true}
          hasNext={false}
          currentIndex={2}
          totalCount={2}
          onClose={() => {}}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('Cost vs. 1Y avg')).toBeInTheDocument()
  })

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

    render(
      <TooltipProvider>
        <DrillDownModal day={selectedDay} contextData={[selectedDay]} open onClose={() => {}} />
      </TooltipProvider>,
    )

    expect(screen.getByText('Request rank').closest('div.rounded-lg')).toHaveTextContent('–')
    expect(screen.getByText('Top by requests').closest('div.rounded-lg')).toHaveTextContent('–')
  })

  it('supports previous/next buttons and arrow-key navigation', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 100,
      totalCost: 5,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 60,
          outputTokens: 20,
          cacheCreationTokens: 10,
          cacheReadTokens: 10,
          thinkingTokens: 0,
          cost: 5,
          requestCount: 2,
        },
      ],
    }

    render(
      <TooltipProvider>
        <DrillDownModal
          day={day}
          contextData={[day]}
          open
          hasPrevious={true}
          hasNext={true}
          currentIndex={3}
          totalCount={8}
          onPrevious={onPrevious}
          onNext={onNext}
          onClose={() => {}}
        />
      </TooltipProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    fireEvent.keyDown(dialog, { key: 'ArrowRight', shiftKey: true })

    expect(onPrevious).toHaveBeenCalledTimes(2)
    expect(onNext).toHaveBeenCalledTimes(2)
  })
})
