import type { DailyUsage } from '@/types'

export function buildDailyUsage(overrides: Partial<DailyUsage> = {}): DailyUsage {
  const inputTokens = overrides.inputTokens ?? 10
  const outputTokens = overrides.outputTokens ?? 5
  const cacheCreationTokens = overrides.cacheCreationTokens ?? 0
  const cacheReadTokens = overrides.cacheReadTokens ?? 0
  const thinkingTokens = overrides.thinkingTokens ?? 0

  return {
    date: '2026-04-07',
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    totalTokens:
      overrides.totalTokens ??
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    totalCost: 5,
    requestCount: 2,
    modelsUsed: ['gpt-5.4'],
    modelBreakdowns: [],
    ...overrides,
  }
}
