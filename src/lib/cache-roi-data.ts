import type { DailyUsage } from '@/types'
import { normalizeModelName } from './model-utils'
import { resolveModelPrice } from './model-pricing'

/** Estimates net cache benefit only for the priced portion, including both reads and writes. */
export function computeCacheROI(data: DailyUsage[]) {
  let actualCost = 0
  let totalCost = 0
  let savingsMin = 0
  let savingsMax = 0
  let coveredTokens = 0
  let totalTokens = 0
  let hasRange = false
  let pricedModels = 0
  const unsupportedModels = new Set<string>()
  const sources = new Map<string, string>()
  for (const day of data) {
    totalCost += day.totalCost
    totalTokens += day.totalTokens
    for (const breakdown of day.modelBreakdowns) {
      const price = resolveModelPrice(breakdown.modelName)
      if (!price) {
        unsupportedModels.add(normalizeModelName(breakdown.modelName))
        continue
      }
      pricedModels += 1
      actualCost += breakdown.cost
      coveredTokens +=
        breakdown.inputTokens +
        breakdown.outputTokens +
        breakdown.cacheReadTokens +
        breakdown.cacheCreationTokens +
        breakdown.thinkingTokens
      const readBenefit = (breakdown.cacheReadTokens / 1_000_000) * (price.input - price.cacheRead)
      savingsMin +=
        readBenefit -
        (breakdown.cacheCreationTokens / 1_000_000) * (price.cacheWriteMax - price.input)
      savingsMax +=
        readBenefit -
        (breakdown.cacheCreationTokens / 1_000_000) * (price.cacheWriteMin - price.input)
      hasRange ||= breakdown.cacheCreationTokens > 0 && price.cacheWriteMin !== price.cacheWriteMax
      sources.set(`${price.provider} ${price.modelId}`, price.source)
    }
  }
  const hypotheticalMin = Math.max(0, actualCost + savingsMin)
  const hypotheticalMax = Math.max(hypotheticalMin, actualCost + savingsMax)
  return {
    actualCost,
    totalCost,
    hypotheticalMin,
    hypotheticalMax,
    savingsMin: hypotheticalMin - actualCost,
    savingsMax: hypotheticalMax - actualCost,
    hasRange,
    hasEstimate: pricedModels > 0,
    costCoverage: totalCost > 0 ? Math.min(100, (actualCost / totalCost) * 100) : 0,
    tokenCoverage: totalTokens > 0 ? Math.min(100, (coveredTokens / totalTokens) * 100) : 0,
    unsupportedModels: [...unsupportedModels].sort(),
    sources: [...sources],
    averagePerPeriod: data.length > 0 ? totalCost / data.length : 0,
  }
}
