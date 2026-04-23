import type {
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionId,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ViewMode,
} from '@/types'
import {
  getDefaultDashboardSectionOrder as getSharedDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility as getSharedDefaultDashboardSectionVisibility,
  normalizeDashboardDatePreset as normalizeSharedDashboardDatePreset,
  normalizeDashboardDefaultFilters as normalizeSharedDashboardDefaultFilters,
  normalizeDashboardSectionOrder as normalizeSharedDashboardSectionOrder,
  normalizeDashboardSectionVisibility as normalizeSharedDashboardSectionVisibility,
  normalizeDashboardViewMode as normalizeSharedDashboardViewMode,
} from '../../shared/app-settings.js'
import dashboardPreferences from '../../shared/dashboard-preferences.json'

/** Describes one configurable dashboard section. */
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

/** Parses and validates the static dashboard preferences config. */
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

/** Lists the supported dashboard date presets. */
export const DASHBOARD_DATE_PRESETS = parsedDashboardPreferences.datePresets
/** Lists the supported dashboard view modes. */
export const DASHBOARD_VIEW_MODES = parsedDashboardPreferences.viewModes
/** Lists the dashboard sections available to the UI. */
export const DASHBOARD_SECTION_DEFINITIONS = parsedDashboardPreferences.sectionDefinitions
/** Maps section ids to their static dashboard definitions. */
export const DASHBOARD_SECTION_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_SECTION_DEFINITIONS.map((section) => [section.id, section]),
) as Record<DashboardSectionId, DashboardSectionDefinition>

/** Defines the default dashboard filter state. */
export const DEFAULT_DASHBOARD_FILTERS: DashboardDefaultFilters =
  normalizeDashboardDefaultFilters(null)

/** Returns the default visibility state for all dashboard sections. */
export function getDefaultDashboardSectionVisibility(): DashboardSectionVisibility {
  return getSharedDefaultDashboardSectionVisibility()
}

/** Returns the default dashboard section order. */
export function getDefaultDashboardSectionOrder(): DashboardSectionOrder {
  return getSharedDefaultDashboardSectionOrder()
}

/** Normalizes an unknown value to a supported dashboard date preset. */
export function normalizeDashboardDatePreset(value: unknown): DashboardDatePreset {
  return normalizeSharedDashboardDatePreset(value)
}

/** Normalizes an unknown value to a supported dashboard view mode. */
export function normalizeDashboardViewMode(value: unknown): ViewMode {
  return normalizeSharedDashboardViewMode(value)
}

/** Normalizes persisted dashboard default filters. */
export function normalizeDashboardDefaultFilters(value: unknown): DashboardDefaultFilters {
  return normalizeSharedDashboardDefaultFilters(value)
}

/** Normalizes persisted dashboard section visibility settings. */
export function normalizeDashboardSectionVisibility(value: unknown): DashboardSectionVisibility {
  return normalizeSharedDashboardSectionVisibility(value)
}

/** Normalizes persisted dashboard section ordering. */
export function normalizeDashboardSectionOrder(value: unknown): DashboardSectionOrder {
  return normalizeSharedDashboardSectionOrder(value)
}
