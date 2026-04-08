import type { AppLanguage, AppSettings, AppTheme, ProviderLimits } from '@/types'
import { normalizeProviderLimitConfig } from '@/lib/provider-limits'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'de',
  theme: 'dark',
  providerLimits: {},
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'de'
}

export function normalizeAppTheme(value: unknown): AppTheme {
  return value === 'light' ? 'light' : 'dark'
}

export function normalizeStoredProviderLimits(value: unknown): ProviderLimits {
  if (!value || typeof value !== 'object') return {}

  const next: ProviderLimits = {}
  for (const [provider, config] of Object.entries(value as Record<string, unknown>)) {
    next[provider] = normalizeProviderLimitConfig(config)
  }

  return next
}

export function normalizeAppSettings(value: unknown): AppSettings {
  const source = value && typeof value === 'object' ? value as Partial<AppSettings> : {}

  return {
    language: normalizeAppLanguage(source.language),
    theme: normalizeAppTheme(source.theme),
    providerLimits: normalizeStoredProviderLimits(source.providerLimits),
  }
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
