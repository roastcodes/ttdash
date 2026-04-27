import type { DailyUsage, DashboardDefaultFilters, ViewMode } from '@/types'
import {
  aggregateToDailyFormat,
  getModelProvider,
  normalizeModelName,
  sortByDate,
} from '../../shared/dashboard-domain.js'

/** Describes the filter inputs needed to derive dashboard usage slices. */
export interface DashboardFilterDataInput {
  sortedData: DailyUsage[]
  viewMode: ViewMode
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string | undefined
  endDate?: string | undefined
}

/** Describes dashboard usage slices and option lists derived from filter state. */
export interface DashboardFilterData {
  filteredDailyData: DailyUsage[]
  filteredData: DailyUsage[]
  availableMonths: string[]
  availableProviders: string[]
  availableModels: string[]
  dateRange: { start: string; end: string } | null
}

/** Describes provider and model options available in a usage dataset. */
export interface DashboardFilterOptions {
  providers: string[]
  models: string[]
}

function addModelsToSet(modelsUsed: string[], target: Set<string>) {
  for (const model of modelsUsed) {
    target.add(normalizeModelName(model))
  }
}

function addProvidersToSet(modelsUsed: string[], target: Set<string>) {
  for (const model of modelsUsed) {
    target.add(getModelProvider(model))
  }
}

function recalculateUsageEntry(
  entry: DailyUsage,
  filteredBreakdowns: DailyUsage['modelBreakdowns'],
): DailyUsage {
  let totalCost = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let thinkingTokens = 0
  let requestCount = 0

  for (const breakdown of filteredBreakdowns) {
    totalCost += breakdown.cost
    inputTokens += breakdown.inputTokens
    outputTokens += breakdown.outputTokens
    cacheCreationTokens += breakdown.cacheCreationTokens
    cacheReadTokens += breakdown.cacheReadTokens
    thinkingTokens += breakdown.thinkingTokens
    requestCount += breakdown.requestCount
  }

  return {
    ...entry,
    totalCost,
    totalTokens:
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    requestCount,
    modelBreakdowns: filteredBreakdowns,
    modelsUsed: [
      ...new Set(filteredBreakdowns.map((breakdown) => normalizeModelName(breakdown.modelName))),
    ],
  }
}

function matchesDateFilters(
  entry: DailyUsage,
  startDate: string | undefined,
  endDate: string | undefined,
  selectedMonth: string | null,
) {
  if (startDate && entry.date < startDate) return false
  if (endDate && entry.date > endDate) return false
  if (selectedMonth && !entry.date.startsWith(selectedMonth)) return false
  return true
}

function applyProviderFilter(entry: DailyUsage, selectedProviders: Set<string>): DailyUsage | null {
  if (selectedProviders.size === 0) return entry

  const filteredBreakdowns = entry.modelBreakdowns.filter((breakdown) =>
    selectedProviders.has(getModelProvider(breakdown.modelName)),
  )

  return filteredBreakdowns.length > 0 ? recalculateUsageEntry(entry, filteredBreakdowns) : null
}

function applyModelFilter(entry: DailyUsage, selectedModels: Set<string>): DailyUsage | null {
  if (selectedModels.size === 0) return entry

  const filteredBreakdowns = entry.modelBreakdowns.filter((breakdown) =>
    selectedModels.has(normalizeModelName(breakdown.modelName)),
  )

  return filteredBreakdowns.length > 0 ? recalculateUsageEntry(entry, filteredBreakdowns) : null
}

/** Collects top-level provider and model options for persisted filter sanitization. */
export function collectDashboardFilterOptions(data: DailyUsage[]): DashboardFilterOptions {
  const providerSet = new Set<string>()
  const modelSet = new Set<string>()

  for (const entry of data) {
    addProvidersToSet(entry.modelsUsed, providerSet)
    addModelsToSet(entry.modelsUsed, modelSet)
  }

  return {
    providers: Array.from(providerSet).sort(),
    models: Array.from(modelSet).sort(),
  }
}

/** Removes persisted dashboard defaults that are not present in the current dataset. */
export function sanitizeDashboardDefaultFilters(
  data: DailyUsage[],
  defaultFilters: DashboardDefaultFilters,
): DashboardDefaultFilters {
  const options = collectDashboardFilterOptions(data)
  const providers = new Set(options.providers)
  const models = new Set(options.models)

  return {
    viewMode: defaultFilters.viewMode,
    datePreset: defaultFilters.datePreset,
    providers: defaultFilters.providers.filter((provider) => providers.has(provider)),
    models: defaultFilters.models.filter((model) => models.has(model)),
  }
}

/** Derives all dashboard filter slices and option lists in one pass over date-matched rows. */
export function deriveDashboardFilterData({
  sortedData,
  viewMode,
  selectedMonth,
  selectedProviders,
  selectedModels,
  startDate,
  endDate,
}: DashboardFilterDataInput): DashboardFilterData {
  const selectedProviderSet = new Set(selectedProviders)
  const selectedModelSet = new Set(selectedModels)
  const availableMonthSet = new Set<string>()
  const availableProviderSet = new Set<string>()
  const availableModelSet = new Set<string>()
  const filteredDailyData: DailyUsage[] = []
  let rangeStart: string | null = null
  let rangeEnd: string | null = null

  for (const entry of sortedData) {
    availableMonthSet.add(entry.date.slice(0, 7))

    if (!matchesDateFilters(entry, startDate, endDate, selectedMonth)) {
      continue
    }

    addProvidersToSet(entry.modelsUsed, availableProviderSet)

    const providerFilteredEntry = applyProviderFilter(entry, selectedProviderSet)
    if (!providerFilteredEntry) {
      continue
    }

    addModelsToSet(providerFilteredEntry.modelsUsed, availableModelSet)

    const modelFilteredEntry = applyModelFilter(providerFilteredEntry, selectedModelSet)
    if (!modelFilteredEntry) {
      continue
    }

    filteredDailyData.push(modelFilteredEntry)
    if (rangeStart === null || modelFilteredEntry.date < rangeStart) {
      rangeStart = modelFilteredEntry.date
    }
    if (rangeEnd === null || modelFilteredEntry.date > rangeEnd) {
      rangeEnd = modelFilteredEntry.date
    }
  }

  return {
    filteredDailyData,
    filteredData: aggregateToDailyFormat(filteredDailyData, viewMode),
    availableMonths: Array.from(availableMonthSet).sort(),
    availableProviders: Array.from(availableProviderSet).sort(),
    availableModels: Array.from(availableModelSet).sort(),
    dateRange: rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : null,
  }
}

/** Sorts raw dashboard usage data for consumers that share the filter pipeline. */
export function sortDashboardUsageData(data: DailyUsage[]): DailyUsage[] {
  return sortByDate(data)
}
