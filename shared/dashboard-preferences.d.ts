import type {
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionId,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ViewMode,
} from './app-settings'

/** Describes one configurable dashboard section. */
export interface DashboardSectionDefinition {
  id: DashboardSectionId
  domId: string
  labelKey: string
}

/** Describes the validated static dashboard preferences config. */
export interface DashboardPreferencesConfig {
  datePresets: DashboardDatePreset[]
  viewModes: ViewMode[]
  sectionDefinitions: DashboardSectionDefinition[]
}

/** Describes the inclusive local date range resolved from a preset. */
export interface DashboardPresetRange {
  startDate?: string
  endDate?: string
}

/** Describes the dashboard date-filter state used to infer the active preset. */
export interface DashboardActivePresetInput {
  selectedMonth?: string | null | undefined
  startDate?: string | undefined
  endDate?: string | undefined
  referenceDate?: Date | string | number | undefined
}

/** Lists the supported dashboard date presets. */
export const DASHBOARD_DATE_PRESETS: DashboardDatePreset[]
/** Lists the supported dashboard view modes. */
export const DASHBOARD_VIEW_MODES: ViewMode[]
/** Lists the dashboard sections available to the app. */
export const DASHBOARD_SECTION_DEFINITIONS: DashboardSectionDefinition[]
/** Maps section ids to their static dashboard definitions. */
export const DASHBOARD_SECTION_DEFINITION_MAP: Record<
  DashboardSectionId,
  DashboardSectionDefinition
>
/** Defines the default dashboard filter state. */
export const DEFAULT_DASHBOARD_FILTERS: DashboardDefaultFilters

/** Parses and validates the static dashboard preferences config. */
export function parseDashboardPreferencesConfig(value: unknown): DashboardPreferencesConfig
/** Builds the default dashboard filter state. */
export function createDefaultDashboardFilters(): DashboardDefaultFilters
/** Returns the default visibility state for all dashboard sections. */
export function getDefaultDashboardSectionVisibility(): DashboardSectionVisibility
/** Returns the default dashboard section order. */
export function getDefaultDashboardSectionOrder(): DashboardSectionOrder
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
/** Resolves a dashboard preset to its inclusive date range. */
export function resolveDashboardPresetRange(
  preset: unknown,
  referenceDate?: Date | string | number,
): DashboardPresetRange
/** Resolves the active preset that matches the current dashboard date filters. */
export function resolveDashboardActivePreset(
  value: DashboardActivePresetInput,
): DashboardDatePreset | null
