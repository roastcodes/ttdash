import type {
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionId,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ViewMode,
} from '@/types'
import dashboardPreferences from '../../shared/dashboard-preferences.json'

export interface DashboardSectionDefinition {
  id: DashboardSectionId
  domId: string
  labelKey: string
}

type DashboardPreferencesConfig = {
  datePresets: DashboardDatePreset[]
  viewModes: ViewMode[]
  sectionDefinitions: DashboardSectionDefinition[]
}

const VALID_DATE_PRESETS: DashboardDatePreset[] = ['all', '7d', '30d', 'month', 'year']
const VALID_VIEW_MODES: ViewMode[] = ['daily', 'monthly', 'yearly']
const VALID_SECTION_IDS: DashboardSectionId[] = [
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
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateStringArray<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fieldName: string,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid dashboard preferences: "${fieldName}" must be an array.`)
  }

  const entries: unknown[] = value
  const invalidEntry = entries.find(
    (entry) => typeof entry !== 'string' || !validValues.includes(entry as T),
  )
  if (invalidEntry !== undefined) {
    throw new Error(`Invalid dashboard preferences: "${fieldName}" contains unsupported values.`)
  }

  return entries.map((entry) => entry as T)
}

function validateSectionDefinitions(value: unknown): DashboardSectionDefinition[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid dashboard preferences: "sectionDefinitions" must be an array.')
  }

  return value.map((entry) => {
    if (!isPlainObject(entry)) {
      throw new Error(
        'Invalid dashboard preferences: each "sectionDefinitions" entry must be an object.',
      )
    }

    const { id, domId, labelKey } = entry
    if (typeof id !== 'string' || !VALID_SECTION_IDS.includes(id as DashboardSectionId)) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions contain an unknown id.')
    }
    if (typeof domId !== 'string' || !domId.trim()) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions require a domId.')
    }
    if (typeof labelKey !== 'string' || !labelKey.trim()) {
      throw new Error('Invalid dashboard preferences: sectionDefinitions require a labelKey.')
    }

    return {
      id: id as DashboardSectionId,
      domId,
      labelKey,
    }
  })
}

export function parseDashboardPreferencesConfig(value: unknown): DashboardPreferencesConfig {
  if (!isPlainObject(value)) {
    throw new Error('Invalid dashboard preferences: expected an object.')
  }

  return {
    datePresets: validateStringArray(value['datePresets'], VALID_DATE_PRESETS, 'datePresets'),
    viewModes: validateStringArray(value['viewModes'], VALID_VIEW_MODES, 'viewModes'),
    sectionDefinitions: validateSectionDefinitions(value['sectionDefinitions']),
  }
}

const rawDashboardPreferences: unknown = dashboardPreferences
const parsedDashboardPreferences = parseDashboardPreferencesConfig(rawDashboardPreferences)

export const DASHBOARD_DATE_PRESETS = parsedDashboardPreferences.datePresets
export const DASHBOARD_VIEW_MODES = parsedDashboardPreferences.viewModes
export const DASHBOARD_SECTION_DEFINITIONS = parsedDashboardPreferences.sectionDefinitions
export const DASHBOARD_SECTION_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_SECTION_DEFINITIONS.map((section) => [section.id, section]),
) as Record<DashboardSectionId, DashboardSectionDefinition>

export const DEFAULT_DASHBOARD_FILTERS: DashboardDefaultFilters = {
  viewMode: 'daily',
  datePreset: 'all',
  providers: [],
  models: [],
}

export function getDefaultDashboardSectionVisibility(): DashboardSectionVisibility {
  return DASHBOARD_SECTION_DEFINITIONS.reduce(
    (visibility, section) => ({
      ...visibility,
      [section.id]: true,
    }),
    {} as DashboardSectionVisibility,
  )
}

export function getDefaultDashboardSectionOrder(): DashboardSectionOrder {
  return DASHBOARD_SECTION_DEFINITIONS.map((section) => section.id)
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ]
}

export function normalizeDashboardDatePreset(value: unknown): DashboardDatePreset {
  return DASHBOARD_DATE_PRESETS.includes(value as DashboardDatePreset)
    ? (value as DashboardDatePreset)
    : 'all'
}

export function normalizeDashboardViewMode(value: unknown): ViewMode {
  return DASHBOARD_VIEW_MODES.includes(value as ViewMode) ? (value as ViewMode) : 'daily'
}

export function normalizeDashboardDefaultFilters(value: unknown): DashboardDefaultFilters {
  const source =
    value && typeof value === 'object' ? (value as Partial<DashboardDefaultFilters>) : {}

  return {
    viewMode: normalizeDashboardViewMode(source.viewMode),
    datePreset: normalizeDashboardDatePreset(source.datePreset),
    providers: normalizeStringList(source.providers),
    models: normalizeStringList(source.models),
  }
}

export function normalizeDashboardSectionVisibility(value: unknown): DashboardSectionVisibility {
  const source =
    value && typeof value === 'object' ? (value as Partial<DashboardSectionVisibility>) : {}
  const defaults = getDefaultDashboardSectionVisibility()

  return DASHBOARD_SECTION_DEFINITIONS.reduce(
    (visibility, section) => ({
      ...visibility,
      [section.id]:
        typeof source[section.id] === 'boolean'
          ? Boolean(source[section.id])
          : defaults[section.id],
    }),
    {} as DashboardSectionVisibility,
  )
}

export function normalizeDashboardSectionOrder(value: unknown): DashboardSectionOrder {
  const defaults = getDefaultDashboardSectionOrder()

  if (!Array.isArray(value)) {
    return defaults
  }

  const incoming = value.filter(
    (sectionId): sectionId is DashboardSectionId =>
      typeof sectionId === 'string' && defaults.includes(sectionId as DashboardSectionId),
  )
  const uniqueIncoming = [...new Set(incoming)]
  const missing = defaults.filter((sectionId) => !uniqueIncoming.includes(sectionId))

  return [...uniqueIncoming, ...missing]
}
