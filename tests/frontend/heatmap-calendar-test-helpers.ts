import type { DailyUsage } from '@/types'

export function buildDailyUsage(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return {
    date: '2026-04-07',
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalTokens: 15,
    totalCost: 5,
    requestCount: 2,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [],
    ...overrides,
  }
}
