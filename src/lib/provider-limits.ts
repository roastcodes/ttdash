import type { DailyUsage, ProviderLimitConfig, ProviderLimits } from '@/types'
import { getModelProvider } from '@/lib/model-utils'
import {
  DEFAULT_PROVIDER_LIMIT_CONFIG as SHARED_DEFAULT_PROVIDER_LIMIT_CONFIG,
  normalizeProviderLimitConfig as normalizeSharedProviderLimitConfig,
} from '../../shared/app-settings.js'

/** Defines the default provider limit configuration. */
export const DEFAULT_PROVIDER_LIMIT_CONFIG: ProviderLimitConfig = {
  ...SHARED_DEFAULT_PROVIDER_LIMIT_CONFIG,
}

/** Normalizes an unknown provider limit object to the app shape. */
export function normalizeProviderLimitConfig(value: unknown): ProviderLimitConfig {
  return normalizeSharedProviderLimitConfig(value)
}

/** Synchronizes provider limits with the currently available providers. */
export function syncProviderLimits(providers: string[], source: unknown): ProviderLimits {
  const input = source && typeof source === 'object' ? (source as Record<string, unknown>) : {}
  const next: ProviderLimits = {}

  for (const provider of providers) {
    next[provider] = normalizeProviderLimitConfig(input[provider])
  }

  return next
}

/** Returns the latest month present in the usage dataset. */
export function getLatestMonth(data: DailyUsage[]): string | null {
  const months = data
    .map((entry) => entry.date.slice(0, 7))
    .filter((month) => /^\d{4}-\d{2}$/.test(month))
    .sort()

  return months.length > 0 ? (months[months.length - 1] ?? null) : null
}

/** Aggregates monthly provider costs for limit and subscription analysis. */
export function buildProviderMonthlyCosts(data: DailyUsage[]) {
  const monthMap = new Map<string, Map<string, number>>()
  const providerTotals = new Map<string, number>()

  for (const day of data) {
    const month = day.date.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) continue

    const providerMap = monthMap.get(month) ?? new Map<string, number>()
    for (const breakdown of day.modelBreakdowns) {
      const provider = getModelProvider(breakdown.modelName)
      providerMap.set(provider, (providerMap.get(provider) ?? 0) + breakdown.cost)
      providerTotals.set(provider, (providerTotals.get(provider) ?? 0) + breakdown.cost)
    }
    monthMap.set(month, providerMap)
  }

  return {
    months: Array.from(monthMap.keys()).sort(),
    monthMap,
    providerTotals,
  }
}
