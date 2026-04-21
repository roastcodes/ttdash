import type { DailyUsage, ModelBreakdown } from '@/types'

interface CreateDailyUsageOptions {
  date: string
  totalCost: number
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  thinkingTokens?: number
  requestCount?: number
  modelBreakdowns?: ModelBreakdown[]
  modelsUsed?: string[]
}

export function createDailyUsage({
  date,
  totalCost,
  inputTokens = 100,
  outputTokens = 50,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
  thinkingTokens = 0,
  requestCount = 1,
  modelBreakdowns,
  modelsUsed,
}: CreateDailyUsageOptions): DailyUsage {
  const defaultBreakdowns: ModelBreakdown[] = [
    {
      modelName: 'gpt-5.4',
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      thinkingTokens,
      cost: totalCost,
      requestCount,
    },
  ]
  const resolvedModelBreakdowns = modelBreakdowns ?? defaultBreakdowns

  return {
    date,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    totalTokens:
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    totalCost,
    requestCount,
    modelsUsed:
      modelsUsed ??
      Array.from(new Set(resolvedModelBreakdowns.map((breakdown) => breakdown.modelName))),
    modelBreakdowns: resolvedModelBreakdowns,
  }
}
