// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { renderWithAppProviders } from '../test-utils'

function renderDrillDown(day: DailyUsage) {
  return renderWithAppProviders(
    <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />,
  )
}

describe('DrillDownModal regressions', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('avoids Infinity and NaN when a day has zero tokens', () => {
    const day: DailyUsage = {
      date: '2026-04-06',
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      totalCost: 4,
      requestCount: 1,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 4,
          requestCount: 1,
        },
      ],
    }

    renderDrillDown(day)

    expect(document.body).not.toHaveTextContent('Infinity')
    expect(document.body).not.toHaveTextContent('NaN')
    expect(screen.getAllByText('–').length).toBeGreaterThan(0)
    expect(screen.getByTestId('drilldown-token-distribution')).toBeInTheDocument()
    expect(screen.queryByTestId('drilldown-token-distribution-input')).not.toBeInTheDocument()
  }, 15_000)

  it('uses the canonical token sum instead of a stale day.totalTokens value', () => {
    const day: DailyUsage = {
      date: '2026-04-07',
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 10,
      thinkingTokens: 0,
      totalTokens: 1,
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

    renderDrillDown(day)

    expect(screen.getAllByText('100').length).toBeGreaterThan(0)
    expect(screen.getByTestId('drilldown-token-distribution-input')).toHaveAttribute(
      'data-target-width',
      '60%',
    )
    expect(screen.getByTestId('drilldown-token-distribution-output')).toHaveAttribute(
      'data-target-width',
      '20%',
    )
    expect(screen.getAllByText(/\$50\.0k/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cache Read').length).toBeGreaterThan(0)
    expect(screen.getAllByText('10.0%').length).toBeGreaterThan(0)
  })

  it('localizes drill-down labels in English', () => {
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

    renderDrillDown(day)

    expect(
      screen.getByText(
        'Detailed day view with benchmarks, model breakdown, provider summary, and token distribution.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Model breakdown')).toBeInTheDocument()
    expect(screen.getByText('Token distribution')).toBeInTheDocument()
    expect(screen.getByText('Cost rank')).toBeInTheDocument()
  })
})
