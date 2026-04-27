import type {
  AppLanguage,
  AppSettings,
  AppTheme,
  DataLoadSource,
  ProviderLimits,
  ReducedMotionPreference,
} from '@/types'
import {
  normalizeAppLanguage as normalizeSharedAppLanguage,
  normalizeAppSettings as normalizeSharedAppSettings,
  normalizeAppTheme as normalizeSharedAppTheme,
  normalizeDataLoadSource as normalizeSharedDataLoadSource,
  normalizeIsoTimestamp as normalizeSharedIsoTimestamp,
  normalizeProviderLimits as normalizeSharedProviderLimits,
  normalizeReducedMotionPreference as normalizeSharedReducedMotionPreference,
} from '../../shared/app-settings.js'

/** Normalizes an unknown language value to a supported app language. */
export function normalizeAppLanguage(value: unknown): AppLanguage {
  return normalizeSharedAppLanguage(value)
}

/** Normalizes an unknown theme value to a supported app theme. */
export function normalizeAppTheme(value: unknown): AppTheme {
  return normalizeSharedAppTheme(value)
}

/** Normalizes an unknown reduced-motion preference to a supported app setting. */
export function normalizeReducedMotionPreference(value: unknown): ReducedMotionPreference {
  return normalizeSharedReducedMotionPreference(value)
}

/** Normalizes persisted provider limit records to the runtime shape. */
export function normalizeStoredProviderLimits(value: unknown): ProviderLimits {
  return normalizeSharedProviderLimits(value)
}

/** Normalizes the persisted data-load source value. */
export function normalizeDataLoadSource(value: unknown): DataLoadSource {
  return normalizeSharedDataLoadSource(value)
}

/** Parses an unknown timestamp into a normalized ISO string. */
export function normalizeStoredTimestamp(value: unknown): string | null {
  return normalizeSharedIsoTimestamp(value)
}

/** Normalizes unknown persisted settings to a complete settings object. */
export function normalizeAppSettings(value: unknown): AppSettings {
  return normalizeSharedAppSettings(value)
}

/** Defines the persisted settings used before the server responds. */
export const DEFAULT_APP_SETTINGS: AppSettings = normalizeAppSettings(null)

/** Applies the active theme class to the document root. */
export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
