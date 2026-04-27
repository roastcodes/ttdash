const dashboardPreferences = require('./dashboard-preferences.json')

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateStringArray(value, validValues, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid dashboard preferences: "${fieldName}" must be an array.`)
  }

  const invalidEntry = value.find(
    (entry) => typeof entry !== 'string' || !validValues.includes(entry),
  )
  if (invalidEntry !== undefined) {
    throw new Error(`Invalid dashboard preferences: "${fieldName}" contains unsupported values.`)
  }

  return value.map((entry) => entry)
}

function validateSectionDefinitions(value, validSectionIds) {
  if (!Array.isArray(value)) {
    throw new Error('Invalid dashboard preferences: "sectionDefinitions" must be an array.')
  }

  const seenIds = new Set()
  const sectionDefinitions = value.map((entry) => {
    if (!isPlainObject(entry)) {
      throw new Error(
        'Invalid dashboard preferences: each "sectionDefinitions" entry must be an object.',
      )
    }

    const { id, domId, labelKey } = entry
    if (typeof id !== 'string' || !validSectionIds.includes(id)) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions contain an unknown id.')
    }
    if (seenIds.has(id)) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions contain duplicate ids.')
    }
    seenIds.add(id)
    if (typeof domId !== 'string' || !domId.trim()) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions require a domId.')
    }
    if (typeof labelKey !== 'string' || !labelKey.trim()) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions require a labelKey.')
    }

    return {
      id,
      domId,
      labelKey,
    }
  })

  if (
    seenIds.size !== validSectionIds.length ||
    !validSectionIds.every((sectionId) => seenIds.has(sectionId))
  ) {
    throw new Error('Invalid dashboard preferences: sectionDefinitions must include every id once.')
  }

  return sectionDefinitions
}

function toLocalDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getReferenceDate(referenceDate = new Date()) {
  const candidate =
    referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate)
  if (!Number.isFinite(candidate.getTime())) {
    const fallback = new Date()
    fallback.setHours(0, 0, 0, 0)
    return fallback
  }

  candidate.setHours(0, 0, 0, 0)
  return candidate
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

/** Parses and validates the static dashboard preferences config. */
function parseDashboardPreferencesConfig(
  value,
  {
    validDatePresets = ['all', '7d', '30d', 'month', 'year'],
    validViewModes = ['daily', 'monthly', 'yearly'],
    validSectionIds = [
      'insights',
      'metrics',
      'today',
      'currentMonth',
      'activity',
      'forecastCache',
      'limits',
      'costAnalysis',
      'tokenAnalysis',
      'requestAnalysis',
      'advancedAnalysis',
      'comparisons',
      'tables',
    ],
  } = {},
) {
  if (!isPlainObject(value)) {
    throw new Error('Invalid dashboard preferences: expected an object.')
  }

  return {
    datePresets: validateStringArray(value.datePresets, validDatePresets, 'datePresets'),
    viewModes: validateStringArray(value.viewModes, validViewModes, 'viewModes'),
    sectionDefinitions: validateSectionDefinitions(value.sectionDefinitions, validSectionIds),
  }
}

const parsedDashboardPreferences = parseDashboardPreferencesConfig(dashboardPreferences)
const DASHBOARD_DATE_PRESETS = parsedDashboardPreferences.datePresets
const DASHBOARD_QUICK_DATE_PRESETS = ['7d', '30d', 'month', 'year', 'all'].filter((preset) =>
  DASHBOARD_DATE_PRESETS.includes(preset),
)
const DASHBOARD_VIEW_MODES = parsedDashboardPreferences.viewModes
const DASHBOARD_SECTION_DEFINITIONS = parsedDashboardPreferences.sectionDefinitions
const DASHBOARD_SECTION_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_SECTION_DEFINITIONS.map((section) => [section.id, section]),
)
const DASHBOARD_SECTION_IDS = DASHBOARD_SECTION_DEFINITIONS.map((section) => section.id)

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

const DEFAULT_DASHBOARD_FILTERS = createDefaultDashboardFilters()

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
 * Resolves a dashboard preset to its inclusive date range.
 *
 * @param preset - The requested dashboard date preset.
 * @param referenceDate - The optional local reference date.
 * @returns The normalized date range for the preset.
 */
function resolveDashboardPresetRange(preset, referenceDate = new Date()) {
  const normalizedPreset = normalizeDashboardDatePreset(preset)
  const today = getReferenceDate(referenceDate)

  switch (normalizedPreset) {
    case '7d': {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(today) }
    }
    case '30d': {
      const start = new Date(today)
      start.setDate(today.getDate() - 29)
      return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(today) }
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(today) }
    }
    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(today) }
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined }
  }
}

/**
 * Resolves the active preset that matches the current dashboard date filters.
 *
 * @param value - The current date-filter state.
 * @returns The matching preset or null for custom ranges.
 */
function resolveDashboardActivePreset(value) {
  const source = isPlainObject(value) ? value : {}

  if (typeof source.selectedMonth === 'string' && source.selectedMonth) {
    return null
  }
  if (!source.startDate && !source.endDate) {
    return 'all'
  }
  if (typeof source.startDate !== 'string' || typeof source.endDate !== 'string') {
    return null
  }

  for (const preset of DASHBOARD_DATE_PRESETS) {
    if (preset === 'all') continue

    const range = resolveDashboardPresetRange(preset, source.referenceDate)
    if (range.startDate === source.startDate && range.endDate === source.endDate) {
      return preset
    }
  }

  return null
}

module.exports = {
  DASHBOARD_DATE_PRESETS,
  DASHBOARD_QUICK_DATE_PRESETS,
  DASHBOARD_SECTION_DEFINITIONS,
  DASHBOARD_SECTION_DEFINITION_MAP,
  DASHBOARD_VIEW_MODES,
  DEFAULT_DASHBOARD_FILTERS,
  createDefaultDashboardFilters,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
  normalizeDashboardDatePreset,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
  normalizeDashboardViewMode,
  parseDashboardPreferencesConfig,
  resolveDashboardActivePreset,
  resolveDashboardPresetRange,
}
