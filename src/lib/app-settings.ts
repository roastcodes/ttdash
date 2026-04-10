import type { AppLanguage, AppSettings, AppTheme, DataLoadSource, ProviderLimits } from '@/types'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
} from '@/lib/dashboard-preferences'
import { normalizeProviderLimitConfig } from '@/lib/provider-limits'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'de',
  theme: 'dark',
  providerLimits: {},
  defaultFilters: DEFAULT_DASHBOARD_FILTERS,
  sectionVisibility: getDefaultDashboardSectionVisibility(),
  sectionOrder: getDefaultDashboardSectionOrder(),
  lastLoadedAt: null,
  lastLoadSource: null,
  cliAutoLoadActive: false,
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

export function normalizeDataLoadSource(value: unknown): DataLoadSource {
  return value === 'file' || value === 'auto-import' || value === 'cli-auto-load'
    ? value
    : null
}

export function normalizeStoredTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

export function normalizeAppSettings(value: unknown): AppSettings {
  const source = value && typeof value === 'object' ? value as Partial<AppSettings> : {}

  return {
    language: normalizeAppLanguage(source.language),
    theme: normalizeAppTheme(source.theme),
    providerLimits: normalizeStoredProviderLimits(source.providerLimits),
    defaultFilters: normalizeDashboardDefaultFilters(source.defaultFilters),
    sectionVisibility: normalizeDashboardSectionVisibility(source.sectionVisibility),
    sectionOrder: normalizeDashboardSectionOrder(source.sectionOrder),
    lastLoadedAt: normalizeStoredTimestamp(source.lastLoadedAt),
    lastLoadSource: normalizeDataLoadSource(source.lastLoadSource),
    cliAutoLoadActive: Boolean(source.cliAutoLoadActive),
  }
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
