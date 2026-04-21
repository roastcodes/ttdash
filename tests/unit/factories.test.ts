import { describe, expect, it } from 'vitest'
import { createDailyUsage } from '../factories'

describe('createDailyUsage', () => {
  it('keeps the default single-model fixture shape when no custom breakdowns are provided', () => {
    const usage = createDailyUsage({ date: '2026-04-01', totalCost: 9 })

    expect(usage).toMatchObject({
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 150,
      totalCost: 9,
      requestCount: 1,
      modelsUsed: ['gpt-5.4'],
    })
  })

  it('derives aggregate totals from custom model breakdowns when overrides are omitted', () => {
    const usage = createDailyUsage({
      date: '2026-04-02',
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 100,
          outputTokens: 20,
          cacheCreationTokens: 5,
          cacheReadTokens: 15,
          thinkingTokens: 10,
          cost: 6,
          requestCount: 2,
        },
        {
          modelName: 'claude-sonnet-4-5',
          inputTokens: 40,
          outputTokens: 30,
          cacheCreationTokens: 2,
          cacheReadTokens: 8,
          thinkingTokens: 4,
          cost: 3,
          requestCount: 1,
        },
      ],
    })

    expect(usage).toMatchObject({
      inputTokens: 140,
      outputTokens: 50,
      cacheCreationTokens: 7,
      cacheReadTokens: 23,
      thinkingTokens: 14,
      totalTokens: 234,
      totalCost: 9,
      requestCount: 3,
      modelsUsed: ['gpt-5.4', 'claude-sonnet-4-5'],
    })
  })

  it('keeps explicit aggregate overrides when callers intentionally provide them', () => {
    const usage = createDailyUsage({
      date: '2026-04-03',
      totalCost: 12,
      inputTokens: 999,
      requestCount: 7,
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 100,
          outputTokens: 50,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          cost: 5,
          requestCount: 2,
        },
      ],
    })

    expect(usage).toMatchObject({
      inputTokens: 999,
      outputTokens: 50,
      totalTokens: 1049,
      totalCost: 12,
      requestCount: 7,
      modelsUsed: ['gpt-5.4'],
    })
  })
})
