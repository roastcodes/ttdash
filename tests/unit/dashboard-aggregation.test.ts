import { describe, expect, it } from 'vitest'
import { summarizeUsageBreakdowns } from '@/lib/dashboard-aggregation'
import type { DailyUsage } from '@/types'
import { dashboardFixture } from '../fixtures/usage-data'

describe('summarizeUsageBreakdowns', () => {
  it('builds model and provider aggregates from a single normalized breakdown pass', () => {
    const summary = summarizeUsageBreakdowns(dashboardFixture)

    expect(summary.allModels).toEqual(['Claude Sonnet 4.5', 'GPT-5.4', 'Gemini 2.5 Pro'])
    expect(summary.modelCosts.get('GPT-5.4')).toEqual({
      cost: 17,
      tokens: 560,
      input: 310,
      output: 155,
      cacheRead: 60,
      cacheCreate: 25,
      thinking: 10,
      requests: 10,
      days: 3,
    })
    expect(summary.providerMetrics.get('OpenAI')).toEqual({
      cost: 17,
      tokens: 560,
      input: 310,
      output: 155,
      cacheRead: 60,
      cacheCreate: 25,
      thinking: 10,
      requests: 10,
      days: 3,
    })
    expect(summary.providerMetrics.get('Google')?.days).toBe(2)
  })

  it('counts activity days once per normalized model and provider per entry', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-01',
        inputTokens: 30,
        outputTokens: 15,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 45,
        totalCost: 3,
        requestCount: 2,
        modelsUsed: ['gpt-5-4', 'gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'gpt-5-4',
            inputTokens: 10,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 1,
            requestCount: 1,
          },
          {
            modelName: 'gpt-5.4',
            inputTokens: 20,
            outputTokens: 10,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 2,
            requestCount: 1,
          },
        ],
      },
    ]

    const summary = summarizeUsageBreakdowns(data)

    expect(summary.allModels).toEqual(['GPT-5.4'])
    expect(summary.modelCosts.get('GPT-5.4')).toMatchObject({ cost: 3, requests: 2, days: 1 })
    expect(summary.providerMetrics.get('OpenAI')).toMatchObject({ cost: 3, requests: 2, days: 1 })
  })

  it('keeps model options aligned with breakdown-backed chart series without dropping modelsUsed-only data', () => {
    const data: DailyUsage[] = [
      {
        date: '2026-04-01',
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        totalTokens: 15,
        totalCost: 1,
        requestCount: 1,
        modelsUsed: ['gpt-5.4'],
        modelBreakdowns: [
          {
            modelName: 'claude-sonnet-4-5',
            inputTokens: 10,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 1,
            requestCount: 1,
          },
        ],
      },
    ]

    const summary = summarizeUsageBreakdowns(data)

    expect(summary.allModels).toEqual(['Claude Sonnet 4.5', 'GPT-5.4'])
    expect(summary.modelCosts.has('Claude Sonnet 4.5')).toBe(true)
    expect(summary.modelCosts.has('GPT-5.4')).toBe(false)
  })
})
