// @vitest-environment jsdom

import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForecastZoomDialog } from '@/components/features/forecast/ForecastZoomDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { MockSvgContainer } from '../recharts-test-utils'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Tooltip: ({ content }: { content?: ReactElement }) =>
    content
      ? cloneElement(content, {
          active: true,
          label: '2026-04-04',
          payload: [
            {
              name: 'Actual cost',
              value: 18,
              color: '#38bdf8',
              dataKey: 'cost',
              payload: {},
            },
            {
              name: 'Forecast',
              value: 12,
              color: '#8b5cf6',
              dataKey: 'forecast',
              payload: {},
            },
          ],
        })
      : null,
}))

function buildDay(
  date: string,
  entries: Array<{
    modelName: string
    cost: number
  }>,
): DailyUsage {
  return {
    date,
    inputTokens: entries.length * 100,
    outputTokens: entries.length * 40,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: entries.length * 140,
    totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
    requestCount: entries.length,
    modelsUsed: entries.map((entry) => entry.modelName),
    modelBreakdowns: entries.map((entry) => ({
      modelName: entry.modelName,
      inputTokens: 100,
      outputTokens: 40,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      cost: entry.cost,
      requestCount: 1,
    })),
  }
}

describe('ForecastZoomDialog', () => {
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

  it('renders the shared forecast dialog with the three forecast views only', () => {
    const data: DailyUsage[] = [
      buildDay('2026-04-01', [
        { modelName: 'gpt-5.4', cost: 10 },
        { modelName: 'claude-sonnet-4', cost: 4 },
      ]),
      buildDay('2026-04-02', [
        { modelName: 'gpt-5.4', cost: 14 },
        { modelName: 'claude-sonnet-4', cost: 5 },
      ]),
      buildDay('2026-04-04', [
        { modelName: 'gpt-5.4', cost: 18 },
        { modelName: 'claude-sonnet-4', cost: 6 },
      ]),
    ]

    render(
      <TooltipProvider>
        <ForecastZoomDialog
          open={true}
          onOpenChange={vi.fn()}
          data={data}
          forecastData={data}
          viewMode="daily"
        />
      </TooltipProvider>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Forecast details')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Combined view of month-end forecast, current month cost forecast, and provider forecast.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Month-end forecast')).toBeInTheDocument()
    expect(screen.getByText('Current month cost forecast')).toBeInTheDocument()
    expect(screen.getByText('Current month forecast by provider')).toBeInTheDocument()
    expect(screen.queryByText('Cache savings (ROI)')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Current month cost forecast expand' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Current month forecast by provider expand' }),
    ).not.toBeInTheDocument()
  })
})
