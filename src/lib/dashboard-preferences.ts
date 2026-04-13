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

export const DASHBOARD_DATE_PRESETS = dashboardPreferences.datePresets as DashboardDatePreset[]
export const DASHBOARD_VIEW_MODES = dashboardPreferences.viewModes as ViewMode[]
export const DASHBOARD_SECTION_DEFINITIONS =
  dashboardPreferences.sectionDefinitions as DashboardSectionDefinition[]
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
