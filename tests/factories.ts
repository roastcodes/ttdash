import type { DailyUsage, ModelBreakdown } from '@/types'

interface CreateDailyUsageOptions {
  date: string
  totalCost?: number
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  thinkingTokens?: number
  requestCount?: number
  modelBreakdowns?: ModelBreakdown[]
  modelsUsed?: string[]
}

export function createDailyUsage(options: CreateDailyUsageOptions): DailyUsage {
  const { date, modelBreakdowns, modelsUsed } = options
  const defaultBreakdowns: ModelBreakdown[] = [
    {
      modelName: 'gpt-5.4',
      inputTokens: options.inputTokens ?? 100,
      outputTokens: options.outputTokens ?? 50,
      cacheCreationTokens: options.cacheCreationTokens ?? 0,
      cacheReadTokens: options.cacheReadTokens ?? 0,
      thinkingTokens: options.thinkingTokens ?? 0,
      cost: options.totalCost ?? 0,
      requestCount: options.requestCount ?? 1,
    },
  ]
  const resolvedModelBreakdowns = modelBreakdowns ?? defaultBreakdowns
  const usesCustomBreakdowns = resolvedModelBreakdowns !== defaultBreakdowns
  const derivedAggregates = resolvedModelBreakdowns.reduce(
    (totals, breakdown) => ({
      inputTokens: totals.inputTokens + breakdown.inputTokens,
      outputTokens: totals.outputTokens + breakdown.outputTokens,
      cacheCreationTokens: totals.cacheCreationTokens + breakdown.cacheCreationTokens,
      cacheReadTokens: totals.cacheReadTokens + breakdown.cacheReadTokens,
      thinkingTokens: totals.thinkingTokens + breakdown.thinkingTokens,
      totalCost: totals.totalCost + breakdown.cost,
      requestCount: totals.requestCount + breakdown.requestCount,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      requestCount: 0,
    },
  )
  const inputTokens =
    options.inputTokens ?? (usesCustomBreakdowns ? derivedAggregates.inputTokens : 100)
  const outputTokens =
    options.outputTokens ?? (usesCustomBreakdowns ? derivedAggregates.outputTokens : 50)
  const cacheCreationTokens =
    options.cacheCreationTokens ??
    (usesCustomBreakdowns ? derivedAggregates.cacheCreationTokens : 0)
  const cacheReadTokens =
    options.cacheReadTokens ?? (usesCustomBreakdowns ? derivedAggregates.cacheReadTokens : 0)
  const thinkingTokens =
    options.thinkingTokens ?? (usesCustomBreakdowns ? derivedAggregates.thinkingTokens : 0)
  const totalCost =
    options.totalCost ??
    (usesCustomBreakdowns ? derivedAggregates.totalCost : defaultBreakdowns[0].cost)
  const requestCount =
    options.requestCount ?? (usesCustomBreakdowns ? derivedAggregates.requestCount : 1)

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
