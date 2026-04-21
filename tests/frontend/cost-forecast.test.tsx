// @vitest-environment jsdom

import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CostForecast } from '@/components/features/forecast/CostForecast'
import { initI18n } from '@/lib/i18n'
import type { DailyUsage } from '@/types'
import { MockSvgContainer } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

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
          label: '2026-04-03',
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

describe('CostForecast', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not show a computed total in the forecast tooltip', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-01',
        inputTokens: 100,
        outputTokens: 40,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 140,
        totalCost: 10,
        requestCount: 2,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 100,
            outputTokens: 40,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 10,
            requestCount: 2,
          },
        ],
      },
      {
        date: '2026-04-02',
        inputTokens: 120,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 170,
        totalCost: 18,
        requestCount: 3,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 120,
            outputTokens: 50,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 18,
            requestCount: 3,
          },
        ],
      },
    ]

    renderWithTooltip(<CostForecast data={data} />)

    expect(screen.getByText('Actual cost:')).toBeInTheDocument()
    expect(screen.getByText('Forecast:')).toBeInTheDocument()
    expect(screen.queryByText('Total:')).not.toBeInTheDocument()
  })

  it('uses month-to-date forecast data instead of a cropped visible date slice in daily mode', () => {
    const fullMonthData: DailyUsage[] = [
      {
        date: '2026-04-01',
        inputTokens: 60,
        outputTokens: 20,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 80,
        totalCost: 6,
        requestCount: 1,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 60,
            outputTokens: 20,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 6,
            requestCount: 1,
          },
        ],
      },
      {
        date: '2026-04-05',
        inputTokens: 120,
        outputTokens: 40,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 160,
        totalCost: 12,
        requestCount: 2,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 120,
            outputTokens: 40,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 12,
            requestCount: 2,
          },
        ],
      },
      {
        date: '2026-04-06',
        inputTokens: 180,
        outputTokens: 60,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 240,
        totalCost: 18,
        requestCount: 3,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5.4',
            inputTokens: 180,
            outputTokens: 60,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 18,
            requestCount: 3,
          },
        ],
      },
    ]

    renderWithTooltip(<CostForecast data={fullMonthData.slice(1)} forecastData={fullMonthData} />)

    expect(screen.getByText(/So far: \$36\.0/)).toBeInTheDocument()
    expect(screen.queryByText(/So far: \$30\.0/)).not.toBeInTheDocument()
  })
})
