/** Lists the languages supported by persisted app settings. */
export type AppLanguage = 'de' | 'en'
/** Lists the available visual themes for persisted app settings. */
export type AppTheme = 'dark' | 'light'
/** Controls how the app should handle reduced motion. */
export type ReducedMotionPreference = 'system' | 'always' | 'never'
/** Lists the supported dashboard date presets in persisted settings. */
export type DashboardDatePreset = 'all' | '7d' | '30d' | 'month' | 'year'
/** Lists the supported dashboard aggregation modes in persisted settings. */
export type ViewMode = 'daily' | 'monthly' | 'yearly'
/** Identifies one configurable dashboard section. */
export type DashboardSectionId =
  | 'insights'
  | 'metrics'
  | 'today'
  | 'currentMonth'
  | 'activity'
  | 'forecastCache'
  | 'limits'
  | 'costAnalysis'
  | 'tokenAnalysis'
  | 'requestAnalysis'
  | 'advancedAnalysis'
  | 'comparisons'
  | 'tables'

/** Describes persisted limit settings for one provider. */
export interface ProviderLimitConfig {
  hasSubscription: boolean
  subscriptionPrice: number
  monthlyLimit: number
}

/** Maps provider ids to their persisted limit configuration. */
export type ProviderLimits = Record<string, ProviderLimitConfig>

/** Stores the persisted default dashboard filters. */
export interface DashboardDefaultFilters {
  viewMode: ViewMode
  datePreset: DashboardDatePreset
  providers: string[]
  models: string[]
}

/** Stores persisted section visibility for the dashboard. */
export type DashboardSectionVisibility = Record<DashboardSectionId, boolean>
/** Stores persisted section ordering for the dashboard. */
export type DashboardSectionOrder = DashboardSectionId[]
/** Identifies where the current dataset was loaded from. */
export type DataLoadSource = 'file' | 'auto-import' | 'cli-auto-load' | null

/** Describes the persisted settings shape stored on disk. */
export interface PersistedAppSettings {
  language: AppLanguage
  theme: AppTheme
  reducedMotionPreference: ReducedMotionPreference
  providerLimits: ProviderLimits
  defaultFilters: DashboardDefaultFilters
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  lastLoadedAt: string | null
  lastLoadSource: DataLoadSource
}

/** Describes the full settings response shape exposed to the app runtime. */
export interface AppSettings extends PersistedAppSettings {
  cliAutoLoadActive: boolean
}

/** Default persisted provider-limit configuration. */
export const DEFAULT_PROVIDER_LIMIT_CONFIG: ProviderLimitConfig
/** Default persisted dashboard filters. */
export const DEFAULT_DASHBOARD_FILTERS: DashboardDefaultFilters
/** Default persisted app settings without runtime-only fields. */
export const DEFAULT_PERSISTED_APP_SETTINGS: PersistedAppSettings
/** Default full app settings including runtime-only fields. */
export const DEFAULT_APP_SETTINGS: AppSettings

/** Builds the default full app settings object. */
export function createDefaultAppSettings(): AppSettings
/** Builds the default persisted app settings object. */
export function createDefaultPersistedAppSettings(): PersistedAppSettings
/** Returns the default visibility state for all dashboard sections. */
export function getDefaultDashboardSectionVisibility(): DashboardSectionVisibility
/** Returns the default dashboard section order. */
export function getDefaultDashboardSectionOrder(): DashboardSectionOrder
/** Normalizes an unknown language value to a supported app language. */
export function normalizeAppLanguage(value: unknown): AppLanguage
/** Normalizes an unknown theme value to a supported app theme. */
export function normalizeAppTheme(value: unknown): AppTheme
/** Normalizes an unknown reduced-motion preference to a supported app setting. */
export function normalizeReducedMotionPreference(value: unknown): ReducedMotionPreference
/** Normalizes an unknown provider limit object to the persisted app shape. */
export function normalizeProviderLimitConfig(value: unknown): ProviderLimitConfig
/** Normalizes a provider limit record keyed by provider id. */
export function normalizeProviderLimits(value: unknown): ProviderLimits
/** Normalizes an unknown value to a supported dashboard date preset. */
export function normalizeDashboardDatePreset(value: unknown): DashboardDatePreset
/** Normalizes an unknown value to a supported dashboard view mode. */
export function normalizeDashboardViewMode(value: unknown): ViewMode
/** Normalizes persisted dashboard default filters. */
export function normalizeDashboardDefaultFilters(value: unknown): DashboardDefaultFilters
/** Normalizes persisted dashboard section visibility settings. */
export function normalizeDashboardSectionVisibility(value: unknown): DashboardSectionVisibility
/** Normalizes persisted dashboard section ordering. */
export function normalizeDashboardSectionOrder(value: unknown): DashboardSectionOrder
/** Normalizes the persisted data-load source value. */
export function normalizeDataLoadSource(value: unknown): DataLoadSource
/** Parses an unknown timestamp into a normalized ISO string. */
export function normalizeIsoTimestamp(value: unknown): string | null
/** Normalizes unknown persisted settings to the disk shape. */
export function normalizePersistedAppSettings(value: unknown): PersistedAppSettings
/** Normalizes unknown settings to the full app settings response shape. */
export function normalizeAppSettings(value: unknown): AppSettings
