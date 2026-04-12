import type { DailyUsage, ProviderLimitConfig, ProviderLimits } from '@/types'
import { getModelProvider } from '@/lib/model-utils'

export const DEFAULT_PROVIDER_LIMIT_CONFIG: ProviderLimitConfig = {
  hasSubscription: false,
  subscriptionPrice: 0,
  monthlyLimit: 0,
}

function sanitizeCurrency(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Number(value.toFixed(2)))
}

export function normalizeProviderLimitConfig(value: unknown): ProviderLimitConfig {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PROVIDER_LIMIT_CONFIG }

  const config = value as Partial<ProviderLimitConfig>
  return {
    hasSubscription: Boolean(config.hasSubscription),
    subscriptionPrice: sanitizeCurrency(config.subscriptionPrice),
    monthlyLimit: sanitizeCurrency(config.monthlyLimit),
  }
}

export function syncProviderLimits(providers: string[], source: unknown): ProviderLimits {
  const input = source && typeof source === 'object' ? source as Record<string, unknown> : {}
  const next: ProviderLimits = {}

  for (const provider of providers) {
    next[provider] = normalizeProviderLimitConfig(input[provider])
  }

  return next
}

export function getLatestMonth(data: DailyUsage[]): string | null {
  const months = data
    .map(entry => entry.date.slice(0, 7))
    .filter(month => /^\d{4}-\d{2}$/.test(month))
    .sort()

  return months.length > 0 ? (months[months.length - 1] ?? null) : null
}

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
