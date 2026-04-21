import { describe, expect, it } from 'vitest'
import { getCurrentMonthForecastData } from '@/lib/data-transforms'
import type { DailyUsage } from '@/types'

describe('getCurrentMonthForecastData', () => {
  const data: DailyUsage[] = [
    {
      date: '2026-03-31',
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 15,
      totalCost: 2,
      requestCount: 1,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 10,
          outputTokens: 5,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 2,
          requestCount: 1,
        },
      ],
    },
    {
      date: '2026-04-01',
      inputTokens: 20,
      outputTokens: 10,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 30,
      totalCost: 4,
      requestCount: 2,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 20,
          outputTokens: 10,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 4,
          requestCount: 2,
        },
      ],
    },
    {
      date: '2026-04-03',
      inputTokens: 30,
      outputTokens: 15,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 45,
      totalCost: 6,
      requestCount: 3,
      modelsUsed: ['claude-sonnet-4-5'],
      modelBreakdowns: [
        {
          modelName: 'claude-sonnet-4-5',
          inputTokens: 30,
          outputTokens: 15,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 6,
          requestCount: 3,
        },
      ],
    },
    {
      date: '2026-04-06',
      inputTokens: 40,
      outputTokens: 20,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 60,
      totalCost: 8,
      requestCount: 4,
      modelsUsed: ['gpt-5.4'],
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 40,
          outputTokens: 20,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 8,
          requestCount: 4,
        },
      ],
    },
  ]

  it('returns the full current month after applying provider and model filters only', () => {
    expect(getCurrentMonthForecastData(data).map((entry) => entry.date)).toEqual([
      '2026-04-01',
      '2026-04-03',
      '2026-04-06',
    ])

    expect(getCurrentMonthForecastData(data, ['OpenAI']).map((entry) => entry.date)).toEqual([
      '2026-04-01',
      '2026-04-06',
    ])

    expect(
      getCurrentMonthForecastData(data, [], ['Claude Sonnet 4.5']).map((entry) => entry.date),
    ).toEqual(['2026-04-03'])
  })

  it('returns no forecast rows when filters only match prior-month data', () => {
    const latestMonthData: DailyUsage[] = [
      {
        ...data[0]!,
        date: '2026-04-28',
      },
      {
        ...data[1]!,
        date: '2026-05-02',
      },
    ]

    expect(
      getCurrentMonthForecastData(latestMonthData, ['Anthropic']).map((entry) => entry.date),
    ).toEqual([])

    expect(
      getCurrentMonthForecastData(latestMonthData, [], ['Claude Sonnet 4.5']).map(
        (entry) => entry.date,
      ),
    ).toEqual([])
  })
})
