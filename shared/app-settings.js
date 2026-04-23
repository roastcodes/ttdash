const dashboardPreferences = require('./dashboard-preferences.json')

const DASHBOARD_DATE_PRESETS = dashboardPreferences.datePresets
const DASHBOARD_VIEW_MODES = dashboardPreferences.viewModes
const DASHBOARD_SECTION_IDS = dashboardPreferences.sectionDefinitions.map((section) => section.id)

const DEFAULT_PROVIDER_LIMIT_CONFIG = {
  hasSubscription: false,
  subscriptionPrice: 0,
  monthlyLimit: 0,
}

/**
 * Returns the default dashboard filter settings.
 *
 * @returns The default dashboard filter settings.
 */
function createDefaultDashboardFilters() {
  return {
    viewMode: 'daily',
    datePreset: 'all',
    providers: [],
    models: [],
  }
}

/**
 * Returns the default visibility state for all dashboard sections.
 *
 * @returns The default visibility state for all dashboard sections.
 */
function getDefaultDashboardSectionVisibility() {
  return Object.fromEntries(DASHBOARD_SECTION_IDS.map((sectionId) => [sectionId, true]))
}

/**
 * Returns the default dashboard section order.
 *
 * @returns The default dashboard section order.
 */
function getDefaultDashboardSectionOrder() {
  return [...DASHBOARD_SECTION_IDS]
}

/**
 * Returns the default persisted settings shape without runtime-only flags.
 *
 * @returns The default persisted settings shape without runtime-only flags.
 */
function createDefaultPersistedAppSettings() {
  return {
    language: 'de',
    theme: 'dark',
    reducedMotionPreference: 'system',
    providerLimits: {},
    defaultFilters: createDefaultDashboardFilters(),
    sectionVisibility: getDefaultDashboardSectionVisibility(),
    sectionOrder: getDefaultDashboardSectionOrder(),
    lastLoadedAt: null,
    lastLoadSource: null,
  }
}

/**
 * Returns the default full app settings shape including runtime-only flags.
 *
 * @returns The default full app settings shape including runtime-only flags.
 */
function createDefaultAppSettings() {
  return {
    ...createDefaultPersistedAppSettings(),
    cliAutoLoadActive: false,
  }
}

const DEFAULT_DASHBOARD_FILTERS = createDefaultDashboardFilters()
const DEFAULT_PERSISTED_APP_SETTINGS = createDefaultPersistedAppSettings()
const DEFAULT_APP_SETTINGS = createDefaultAppSettings()

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Normalizes an unknown language value to a supported app language.
 *
 * @param value - The requested language value.
 * @returns The normalized app language.
 */
function normalizeAppLanguage(value) {
  return value === 'en' ? 'en' : 'de'
}

/**
 * Normalizes an unknown theme value to a supported app theme.
 *
 * @param value - The requested theme value.
 * @returns The normalized app theme.
 */
function normalizeAppTheme(value) {
  return value === 'light' ? 'light' : 'dark'
}

/**
 * Normalizes an unknown reduced-motion preference to a supported app setting.
 *
 * @param value - The requested reduced-motion value.
 * @returns The normalized reduced-motion preference.
 */
function normalizeReducedMotionPreference(value) {
  return value === 'always' || value === 'never' ? value : 'system'
}

function sanitizeCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Number(value.toFixed(2)))
}

/**
 * Normalizes an unknown provider limit object to the persisted app shape.
 *
 * @param value - The provider-specific configuration value.
 * @returns The normalized provider-limit configuration.
 */
function normalizeProviderLimitConfig(value) {
  if (!isPlainObject(value)) return { ...DEFAULT_PROVIDER_LIMIT_CONFIG }

  return {
    hasSubscription: Boolean(value.hasSubscription),
    subscriptionPrice: sanitizeCurrency(value.subscriptionPrice),
    monthlyLimit: sanitizeCurrency(value.monthlyLimit),
  }
}

/**
 * Normalizes a provider limit record keyed by provider id.
 *
 * @param value - The provider limit map.
 * @returns The normalized provider-limit record.
 */
function normalizeProviderLimits(value) {
  if (!isPlainObject(value)) return {}

  const next = {}
  for (const [provider, config] of Object.entries(value)) {
    next[provider] = normalizeProviderLimitConfig(config)
  }

  return next
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ]
}

/**
 * Normalizes an unknown value to a supported dashboard date preset.
 *
 * @param value - The requested dashboard date preset.
 * @returns The normalized dashboard date preset.
 */
function normalizeDashboardDatePreset(value) {
  return DASHBOARD_DATE_PRESETS.includes(value) ? value : 'all'
}

/**
 * Normalizes an unknown value to a supported dashboard view mode.
 *
 * @param value - The requested dashboard view mode.
 * @returns The normalized dashboard view mode.
 */
function normalizeDashboardViewMode(value) {
  return DASHBOARD_VIEW_MODES.includes(value) ? value : 'daily'
}

/**
 * Normalizes persisted dashboard default filters.
 *
 * @param value - The persisted dashboard filters payload.
 * @returns The normalized dashboard default filters.
 */
function normalizeDashboardDefaultFilters(value) {
  const source = isPlainObject(value) ? value : {}

  return {
    viewMode: normalizeDashboardViewMode(source.viewMode),
    datePreset: normalizeDashboardDatePreset(source.datePreset),
    providers: normalizeStringList(source.providers),
    models: normalizeStringList(source.models),
  }
}

/**
 * Normalizes persisted dashboard section visibility settings.
 *
 * @param value - The persisted visibility payload.
 * @returns The normalized dashboard section visibility map.
 */
function normalizeDashboardSectionVisibility(value) {
  const source = isPlainObject(value) ? value : {}
  const defaults = getDefaultDashboardSectionVisibility()

  return DASHBOARD_SECTION_IDS.reduce((visibility, sectionId) => {
    visibility[sectionId] =
      typeof source[sectionId] === 'boolean' ? source[sectionId] : defaults[sectionId]
    return visibility
  }, {})
}

/**
 * Normalizes persisted dashboard section ordering.
 *
 * @param value - The persisted section order payload.
 * @returns The normalized dashboard section order.
 */
function normalizeDashboardSectionOrder(value) {
  const defaults = getDefaultDashboardSectionOrder()

  if (!Array.isArray(value)) {
    return defaults
  }

  const incoming = value.filter(
    (sectionId) => typeof sectionId === 'string' && defaults.includes(sectionId),
  )
  const uniqueIncoming = [...new Set(incoming)]
  const missing = defaults.filter((sectionId) => !uniqueIncoming.includes(sectionId))

  return [...uniqueIncoming, ...missing]
}

/**
 * Normalizes the persisted data-load source value.
 *
 * @param value - The persisted load-source value.
 * @returns The normalized data-load source.
 */
function normalizeDataLoadSource(value) {
  return value === 'file' || value === 'auto-import' || value === 'cli-auto-load' ? value : null
}

/**
 * Parses an unknown timestamp into a normalized ISO string.
 *
 * @param value - The persisted timestamp value.
 * @returns The normalized ISO timestamp.
 */
function normalizeIsoTimestamp(value) {
  if (typeof value !== 'string') return null

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

/**
 * Normalizes unknown persisted settings to the disk shape without runtime-only fields.
 *
 * @param value - The unknown persisted settings value.
 * @returns The normalized persisted settings object.
 */
function normalizePersistedAppSettings(value) {
  const source = isPlainObject(value) ? value : {}

  return {
    language: normalizeAppLanguage(source.language),
    theme: normalizeAppTheme(source.theme),
    reducedMotionPreference: normalizeReducedMotionPreference(source.reducedMotionPreference),
    providerLimits: normalizeProviderLimits(source.providerLimits),
    defaultFilters: normalizeDashboardDefaultFilters(source.defaultFilters),
    sectionVisibility: normalizeDashboardSectionVisibility(source.sectionVisibility),
    sectionOrder: normalizeDashboardSectionOrder(source.sectionOrder),
    lastLoadedAt: normalizeIsoTimestamp(source.lastLoadedAt),
    lastLoadSource: normalizeDataLoadSource(source.lastLoadSource),
  }
}

/**
 * Normalizes unknown settings to the full app settings response shape.
 *
 * @param value - The unknown settings value.
 * @returns The normalized full app settings object.
 */
function normalizeAppSettings(value) {
  const source = isPlainObject(value) ? value : {}

  return {
    ...normalizePersistedAppSettings(source),
    cliAutoLoadActive: Boolean(source.cliAutoLoadActive),
  }
}

module.exports = {
  DEFAULT_APP_SETTINGS,
  DEFAULT_DASHBOARD_FILTERS,
  DEFAULT_PERSISTED_APP_SETTINGS,
  DEFAULT_PROVIDER_LIMIT_CONFIG,
  createDefaultAppSettings,
  createDefaultPersistedAppSettings,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
  normalizeAppLanguage,
  normalizeAppSettings,
  normalizeAppTheme,
  normalizeDashboardDatePreset,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
  normalizeDashboardViewMode,
  normalizeDataLoadSource,
  normalizeIsoTimestamp,
  normalizePersistedAppSettings,
  normalizeProviderLimitConfig,
  normalizeProviderLimits,
  normalizeReducedMotionPreference,
}
