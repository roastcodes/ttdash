import { describe, expect, it } from 'vitest'
import {
  buildRecentDayRows,
  buildRecentDaysBenchmarkMap,
  deriveModelEfficiencyRows,
  deriveProviderEfficiencyRows,
  findMostEfficientModel,
  findMostEfficientProvider,
  getAriaSort,
  resolveNextSortState,
  sortModelEfficiencyRows,
  sortProviderEfficiencyRows,
  sortRecentDays,
  summarizeRecentDays,
} from '@/lib/sortable-table-data'
import type { AggregateMetrics, DailyUsage } from '@/types'

function buildUsage(date: string, cost: number, tokens: number, requests: number): DailyUsage {
  return {
    date,
    inputTokens: tokens,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: Math.floor(tokens / 2),
    thinkingTokens: 0,
    totalTokens: tokens,
    totalCost: cost,
    requestCount: requests,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [
      {
        modelName: 'openai/gpt-5.4',
        inputTokens: tokens,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        cost,
        requestCount: requests,
      },
      {
        modelName: 'gpt-5.4',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        thinkingTokens: 0,
        cost: 0,
        requestCount: 0,
      },
    ],
  }
}

describe('sortable table data', () => {
  it('resolves reusable sort state and aria-sort values', () => {
    const current = { sortKey: 'cost', sortAsc: false }

    expect(resolveNextSortState(current, 'cost')).toEqual({ sortKey: 'cost', sortAsc: true })
    expect(resolveNextSortState(current, 'tokens')).toEqual({ sortKey: 'tokens', sortAsc: false })
    expect(getAriaSort('cost', current)).toBe('descending')
    expect(getAriaSort('tokens', current)).toBe('none')
  })

  it('derives and sorts provider efficiency rows', () => {
    const providerMetrics = new Map<string, AggregateMetrics>([
      ['OpenAI', { cost: 10, tokens: 1_000, requests: 5, cacheRead: 200, days: 2 }],
      ['Anthropic', { cost: 5, tokens: 2_000, requests: 1, cacheRead: 1_000, days: 1 }],
    ])
    const rows = deriveProviderEfficiencyRows(providerMetrics, 15)

    expect(rows.find((row) => row.name === 'OpenAI')).toMatchObject({
      share: 66.66666666666666,
      costPerRequest: 2,
      costPerMillion: 10_000,
      cacheShare: 20,
    })
    expect(sortProviderEfficiencyRows(rows, 'requests', false).map((row) => row.name)).toEqual([
      'OpenAI',
      'Anthropic',
    ])
    expect(findMostEfficientProvider(rows)?.name).toBe('Anthropic')
  })

  it('derives and sorts model efficiency rows with request share', () => {
    const modelCosts = new Map([
      ['GPT-5.4', { cost: 10, tokens: 1_000, cacheRead: 200, thinking: 50, days: 2, requests: 5 }],
      [
        'Sonnet 4.6',
        { cost: 5, tokens: 2_000, cacheRead: 1_000, thinking: 0, days: 1, requests: 1 },
      ],
    ])
    const rows = deriveModelEfficiencyRows(modelCosts, 15)

    expect(rows.find((row) => row.name === 'GPT-5.4')).toMatchObject({
      share: 66.66666666666666,
      requestShare: 83.33333333333334,
      cacheShare: 20,
      thinkingShare: 5,
    })
    expect(sortModelEfficiencyRows(rows, 'tokens', false).map((row) => row.name)).toEqual([
      'Sonnet 4.6',
      'GPT-5.4',
    ])
    expect(findMostEfficientModel(rows)?.name).toBe('Sonnet 4.6')
  })

  it('sorts recent days and builds benchmark-backed row data', () => {
    const days = [
      buildUsage('2026-04-01', 2, 200, 2),
      buildUsage('2026-04-02', 5, 500, 4),
      buildUsage('2026-04-03', 1, 100, 1),
    ]
    const chronological = sortRecentDays(days, 'date', true)
    const benchmarkMap = buildRecentDaysBenchmarkMap(chronological)
    const rows = buildRecentDayRows(sortRecentDays(days, 'cost', false), benchmarkMap)

    expect(rows.map((row) => row.day.date)).toEqual(['2026-04-02', '2026-04-01', '2026-04-03'])
    expect(rows[0]?.benchmark).toMatchObject({ prevCostDelta: 150, avgCost7: 2 })
    expect(rows[0]?.costPerM).toBe(10_000)
    expect(rows[0]?.uniqueModels).toEqual([{ name: 'GPT-5.4', provider: 'OpenAI' }])
  })

  it('summarizes recent days with cache share and top cost day', () => {
    const summary = summarizeRecentDays([
      buildUsage('2026-04-01', 2, 200, 2),
      buildUsage('2026-04-02', 5, 500, 4),
    ])

    expect(summary).toMatchObject({
      totalCost: 7,
      totalTokens: 700,
      totalRequests: 6,
      cacheShare: 50,
      top: expect.objectContaining({ date: '2026-04-02' }),
    })
    expect(summarizeRecentDays([])).toBeNull()
  })
})
