import { describe, expect, it } from 'vitest'
import {
  deriveDrillDownData,
  getDelta,
  getDrillDownPeriodKind,
  type DrillDownModelData,
} from '@/lib/drill-down-data'
import type { DailyUsage } from '@/types'

function buildDay(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return {
    date: '2026-04-07',
    inputTokens: 700,
    outputTokens: 230,
    cacheCreationTokens: 40,
    cacheReadTokens: 80,
    thinkingTokens: 50,
    totalTokens: 1100,
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
        modelName: 'openai/gpt-5.4',
        inputTokens: 50,
        outputTokens: 20,
        cacheCreationTokens: 0,
        cacheReadTokens: 10,
        thinkingTokens: 0,
        cost: 2,
        requestCount: 1,
      },
      {
        modelName: 'claude-opus-4.1',
        inputTokens: 200,
        outputTokens: 60,
        cacheCreationTokens: 20,
        cacheReadTokens: 30,
        thinkingTokens: 10,
        cost: 8,
        requestCount: 3,
      },
    ],
    ...overrides,
  }
}

describe('drill-down data derivation', () => {
  it('detects the selected period kind from the date shape', () => {
    expect(getDrillDownPeriodKind('2026-04-07')).toBe('day')
    expect(getDrillDownPeriodKind('2026-04')).toBe('month')
    expect(getDrillDownPeriodKind('2026')).toBe('year')
  })

  it('aggregates model and provider data once for the modal view model', () => {
    const previousDay = buildDay({
      date: '2026-04-06',
      totalCost: 14,
      requestCount: 4,
      inputTokens: 300,
      outputTokens: 120,
      cacheCreationTokens: 20,
      cacheReadTokens: 40,
      thinkingTokens: 20,
      totalTokens: 500,
      modelBreakdowns: [
        {
          modelName: 'gpt-5.4',
          inputTokens: 300,
          outputTokens: 120,
          cacheCreationTokens: 20,
          cacheReadTokens: 40,
          thinkingTokens: 20,
          cost: 14,
          requestCount: 4,
        },
      ],
    })
    const selectedDay = buildDay()

    const data = deriveDrillDownData(selectedDay, [selectedDay, previousDay])
    const gptModel = data.modelData.find(
      (model): model is DrillDownModelData => model.name === 'GPT-5.4',
    )

    expect(data.periodKind).toBe('day')
    expect(data.contextIndex).toBe(1)
    expect(data.previousEntry?.date).toBe('2026-04-06')
    expect(gptModel).toMatchObject({
      provider: 'OpenAI',
      cost: 20,
      tokens: 780,
      requests: 7,
    })
    expect(data.providerData).toEqual([
      expect.objectContaining({ provider: 'OpenAI', cost: 20, activeModels: 1 }),
      expect.objectContaining({ provider: 'Anthropic', cost: 8, activeModels: 1 }),
    ])
    expect(data.costRanking).toBe(1)
    expect(data.requestRanking).toBe(1)
    expect(data.avgCost7).toBe(14)
    expect(data.previousTokens).toBe(500)
    expect(data.topCostModel?.name).toBe('GPT-5.4')
    expect(data.topRequestModel?.name).toBe('GPT-5.4')
    expect(data.priciestPerMillionModel?.name).toBe('GPT-5.4')
  })

  it('keeps request rankings unavailable when no request counts exist', () => {
    const selectedDay = buildDay({
      requestCount: 0,
      modelBreakdowns: buildDay().modelBreakdowns.map((breakdown) => ({
        ...breakdown,
        requestCount: 0,
      })),
    })

    const data = deriveDrillDownData(selectedDay, [selectedDay])

    expect(data.hasRequestCounts).toBe(false)
    expect(data.requestRanking).toBe(0)
    expect(data.topRequestModel).toBeNull()
  })

  it('derives token segment percentages without presentation labels', () => {
    const data = deriveDrillDownData(buildDay(), [buildDay()])

    expect(data.tokenSegments.map((segment) => segment.id)).toEqual([
      'cacheRead',
      'cacheWrite',
      'input',
      'output',
      'thinking',
    ])
    expect(data.tokenDistributionSegments).toEqual([
      expect.objectContaining({ id: 'cacheRead', width: 7.273 }),
      expect.objectContaining({ id: 'cacheWrite', width: 3.636 }),
      expect.objectContaining({ id: 'input', width: 63.636 }),
      expect.objectContaining({ id: 'output', width: 20.909 }),
      expect.objectContaining({ id: 'thinking', width: 4.545 }),
    ])
  })

  it('computes deltas while preserving the zero-reference fallback', () => {
    expect(getDelta(15, 10)).toEqual({ absolute: 5, percent: 50 })
    expect(getDelta(5, 0)).toEqual({ absolute: 5, percent: null })
    expect(getDelta(5, null)).toBeNull()
  })
})
