import { normalizeDashboardDefaultFilters } from '@/lib/dashboard-preferences'
import { DEFAULT_PROVIDER_LIMIT_CONFIG, syncProviderLimits } from '@/lib/provider-limits'
import type {
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
} from '@/types'

/** Parses display-rounded settings input; use a decimal library for exact financial math. */
export function parseSettingsNumberInput(value: string): number {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return 0

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return 0

  return Math.max(0, Math.round(parsed * 100) / 100)
}

/** Toggles one string id inside a multi-select settings draft list. */
export function toggleSettingsSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

/** Trims, deduplicates, and sorts a settings draft selection list. */
export function normalizeSettingsSelection(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  )
}

/** Builds a provider-limit draft that only keeps the currently relevant providers. */
export function buildSettingsProviderLimitDraft(
  providers: string[],
  source: unknown,
): ProviderLimits {
  return syncProviderLimits(providers, source)
}

/** Applies a partial provider-limit update while preserving the full provider config shape. */
export function patchSettingsProviderLimitDraft(
  limits: ProviderLimits,
  provider: string,
  patch: Partial<ProviderLimits[string]>,
): ProviderLimits {
  return {
    ...limits,
    [provider]: {
      ...(limits[provider] ?? DEFAULT_PROVIDER_LIMIT_CONFIG),
      ...patch,
    },
  }
}

/** Clones and normalizes dashboard default filters for use in settings draft state. */
export function cloneSettingsDefaultFilters(
  filters: DashboardDefaultFilters,
): DashboardDefaultFilters {
  return normalizeDashboardDefaultFilters(filters)
}

/** Clones dashboard section visibility so settings drafts never mutate the incoming prop object. */
export function cloneSettingsSectionVisibility(
  visibility: DashboardSectionVisibility,
): DashboardSectionVisibility {
  return { ...visibility }
}

/** Clones dashboard section order so settings drafts never mutate the incoming prop array. */
export function cloneSettingsSectionOrder(order: DashboardSectionOrder): DashboardSectionOrder {
  return [...order]
}

/** Moves one dashboard section inside the settings draft order by one slot. */
export function moveSettingsSection(
  order: DashboardSectionOrder,
  sectionId: DashboardSectionOrder[number],
  direction: -1 | 1,
) {
  const currentIndex = order.indexOf(sectionId)
  const targetIndex = currentIndex + direction

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order
  }

  const next = [...order]
  const [moved] = next.splice(currentIndex, 1)
  if (!moved) return order
  next.splice(targetIndex, 0, moved)
  return next
}

/** Reorders dashboard sections by removing the source and inserting it before the target section. */
export function reorderSettingsSections(
  order: DashboardSectionOrder,
  sourceId: DashboardSectionOrder[number],
  targetId: DashboardSectionOrder[number],
) {
  if (sourceId === targetId) return order

  const sourceIndex = order.indexOf(sourceId)
  const targetIndex = order.indexOf(targetId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return order
  }

  const next = [...order]
  const [moved] = next.splice(sourceIndex, 1)
  if (!moved) return order

  const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  next.splice(insertionIndex, 0, moved)
  return next
}
