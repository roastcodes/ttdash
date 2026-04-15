import type {
  AppLanguage,
  AppSettings,
  AppTheme,
  DataLoadSource,
  ProviderLimits,
  ReducedMotionPreference,
} from '@/types'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
} from '@/lib/dashboard-preferences'
import { normalizeProviderLimitConfig } from '@/lib/provider-limits'

/** Defines the persisted settings used before the server responds. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'de',
  theme: 'dark',
  reducedMotionPreference: 'system',
  providerLimits: {},
  defaultFilters: DEFAULT_DASHBOARD_FILTERS,
  sectionVisibility: getDefaultDashboardSectionVisibility(),
  sectionOrder: getDefaultDashboardSectionOrder(),
  lastLoadedAt: null,
  lastLoadSource: null,
  cliAutoLoadActive: false,
}

/** Normalizes an unknown language value to a supported app language. */
export function normalizeAppLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'de'
}

/** Normalizes an unknown theme value to a supported app theme. */
export function normalizeAppTheme(value: unknown): AppTheme {
  return value === 'light' ? 'light' : 'dark'
}

/** Normalizes an unknown reduced-motion preference to a supported app setting. */
export function normalizeReducedMotionPreference(value: unknown): ReducedMotionPreference {
  return value === 'always' || value === 'never' ? value : 'system'
}

/** Normalizes persisted provider limit records to the runtime shape. */
export function normalizeStoredProviderLimits(value: unknown): ProviderLimits {
  if (!value || typeof value !== 'object') return {}

  const next: ProviderLimits = {}
  for (const [provider, config] of Object.entries(value as Record<string, unknown>)) {
    next[provider] = normalizeProviderLimitConfig(config)
  }

  return next
}

/** Normalizes the persisted data-load source value. */
export function normalizeDataLoadSource(value: unknown): DataLoadSource {
  return value === 'file' || value === 'auto-import' || value === 'cli-auto-load' ? value : null
}

/** Parses an unknown timestamp into a normalized ISO string. */
export function normalizeStoredTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

/** Normalizes unknown persisted settings to a complete settings object. */
export function normalizeAppSettings(value: unknown): AppSettings {
  const source = value && typeof value === 'object' ? (value as Partial<AppSettings>) : {}

  return {
    language: normalizeAppLanguage(source.language),
    theme: normalizeAppTheme(source.theme),
    reducedMotionPreference: normalizeReducedMotionPreference(source.reducedMotionPreference),
    providerLimits: normalizeStoredProviderLimits(source.providerLimits),
    defaultFilters: normalizeDashboardDefaultFilters(source.defaultFilters),
    sectionVisibility: normalizeDashboardSectionVisibility(source.sectionVisibility),
    sectionOrder: normalizeDashboardSectionOrder(source.sectionOrder),
    lastLoadedAt: normalizeStoredTimestamp(source.lastLoadedAt),
    lastLoadSource: normalizeDataLoadSource(source.lastLoadSource),
    cliAutoLoadActive: Boolean(source.cliAutoLoadActive),
  }
}

/** Applies the active theme class to the document root. */
export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
