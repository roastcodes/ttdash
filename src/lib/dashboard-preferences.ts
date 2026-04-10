import type {
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionId,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ViewMode,
} from '@/types'

export const DASHBOARD_DATE_PRESETS: DashboardDatePreset[] = ['all', '7d', '30d', 'month', 'year']
export const DASHBOARD_VIEW_MODES: ViewMode[] = ['daily', 'monthly', 'yearly']
export const DASHBOARD_SECTION_DEFINITIONS: Array<{ id: DashboardSectionId; domId: string; labelKey: string }> = [
  { id: 'insights', domId: 'insights', labelKey: 'helpPanel.sectionLabels.insights' },
  { id: 'metrics', domId: 'metrics', labelKey: 'helpPanel.sectionLabels.metrics' },
  { id: 'today', domId: 'today', labelKey: 'helpPanel.sectionLabels.today' },
  { id: 'currentMonth', domId: 'current-month', labelKey: 'helpPanel.sectionLabels.currentMonth' },
  { id: 'activity', domId: 'activity', labelKey: 'helpPanel.sectionLabels.activity' },
  { id: 'forecastCache', domId: 'forecast-cache', labelKey: 'helpPanel.sectionLabels.forecastCache' },
  { id: 'limits', domId: 'limits', labelKey: 'helpPanel.sectionLabels.limits' },
  { id: 'costAnalysis', domId: 'charts', labelKey: 'helpPanel.sectionLabels.costAnalysis' },
  { id: 'tokenAnalysis', domId: 'token-analysis', labelKey: 'helpPanel.sectionLabels.tokenAnalysis' },
  { id: 'requestAnalysis', domId: 'request-analysis', labelKey: 'helpPanel.sectionLabels.requestAnalysis' },
  { id: 'advancedAnalysis', domId: 'advanced-analysis', labelKey: 'helpPanel.sectionLabels.advancedAnalysis' },
  { id: 'comparisons', domId: 'comparisons', labelKey: 'helpPanel.sectionLabels.comparisons' },
  { id: 'tables', domId: 'tables', labelKey: 'helpPanel.sectionLabels.tables' },
]
export const DASHBOARD_SECTION_DEFINITION_MAP = Object.fromEntries(
  DASHBOARD_SECTION_DEFINITIONS.map((section) => [section.id, section]),
) as Record<DashboardSectionId, (typeof DASHBOARD_SECTION_DEFINITIONS)[number]>

export const DEFAULT_DASHBOARD_FILTERS: DashboardDefaultFilters = {
  viewMode: 'daily',
  datePreset: 'all',
  providers: [],
  models: [],
}

export function getDefaultDashboardSectionVisibility(): DashboardSectionVisibility {
  return DASHBOARD_SECTION_DEFINITIONS.reduce((visibility, section) => ({
    ...visibility,
    [section.id]: true,
  }), {} as DashboardSectionVisibility)
}

export function getDefaultDashboardSectionOrder(): DashboardSectionOrder {
  return DASHBOARD_SECTION_DEFINITIONS.map((section) => section.id)
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [...new Set(value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean))]
}

export function normalizeDashboardDatePreset(value: unknown): DashboardDatePreset {
  return DASHBOARD_DATE_PRESETS.includes(value as DashboardDatePreset)
    ? value as DashboardDatePreset
    : 'all'
}

export function normalizeDashboardViewMode(value: unknown): ViewMode {
  return DASHBOARD_VIEW_MODES.includes(value as ViewMode)
    ? value as ViewMode
    : 'daily'
}

export function normalizeDashboardDefaultFilters(value: unknown): DashboardDefaultFilters {
  const source = value && typeof value === 'object' ? value as Partial<DashboardDefaultFilters> : {}

  return {
    viewMode: normalizeDashboardViewMode(source.viewMode),
    datePreset: normalizeDashboardDatePreset(source.datePreset),
    providers: normalizeStringList(source.providers),
    models: normalizeStringList(source.models),
  }
}

export function normalizeDashboardSectionVisibility(value: unknown): DashboardSectionVisibility {
  const source = value && typeof value === 'object' ? value as Partial<DashboardSectionVisibility> : {}
  const defaults = getDefaultDashboardSectionVisibility()

  return DASHBOARD_SECTION_DEFINITIONS.reduce((visibility, section) => ({
    ...visibility,
    [section.id]: typeof source[section.id] === 'boolean' ? Boolean(source[section.id]) : defaults[section.id],
  }), {} as DashboardSectionVisibility)
}

export function normalizeDashboardSectionOrder(value: unknown): DashboardSectionOrder {
  const defaults = getDefaultDashboardSectionOrder()

  if (!Array.isArray(value)) {
    return defaults
  }

  const incoming = value.filter((sectionId): sectionId is DashboardSectionId => (
    typeof sectionId === 'string' && defaults.includes(sectionId as DashboardSectionId)
  ))
  const uniqueIncoming = [...new Set(incoming)]
  const missing = defaults.filter((sectionId) => !uniqueIncoming.includes(sectionId))

  return [...uniqueIncoming, ...missing]
}
