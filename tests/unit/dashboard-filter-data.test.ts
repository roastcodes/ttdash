import { describe, expect, it } from 'vitest'
import {
  deriveDashboardFilterData,
  sanitizeDashboardDefaultFilters,
  sortDashboardUsageData,
} from '@/lib/dashboard-filter-data'
import {
  aggregateToDailyFormat,
  filterByDateRange,
  filterByModels,
  filterByMonth,
  filterByProviders,
  getAvailableMonths,
  getDateRange,
  sortByDate,
} from '@/lib/data-transforms'
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'
import type { DailyUsage, DashboardDefaultFilters, ViewMode } from '@/types'
import { dashboardFixture } from '../fixtures/usage-data'

interface FilterScenario {
  viewMode: ViewMode
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string
  endDate?: string
}

function deriveLegacyFilterData(data: DailyUsage[], scenario: FilterScenario) {
  const sortedData = sortByDate(data)
  let preProviderFilteredData = filterByDateRange(sortedData, scenario.startDate, scenario.endDate)
  preProviderFilteredData = filterByMonth(preProviderFilteredData, scenario.selectedMonth)
  const preModelFilteredData = filterByProviders(
    preProviderFilteredData,
    scenario.selectedProviders,
  )
  const filteredDailyData = filterByModels(preModelFilteredData, scenario.selectedModels)

  return {
    filteredDailyData,
    filteredData: aggregateToDailyFormat(filteredDailyData, scenario.viewMode),
    availableMonths: getAvailableMonths(sortedData),
    availableProviders: getUniqueProviders(
      preProviderFilteredData.map((entry) => entry.modelsUsed),
    ),
    availableModels: getUniqueModels(preModelFilteredData.map((entry) => entry.modelsUsed)),
    dateRange: getDateRange(filteredDailyData),
  }
}

describe('deriveDashboardFilterData', () => {
  it('matches the existing staged filter semantics for representative filter combinations', () => {
    const scenarios: FilterScenario[] = [
      {
        viewMode: 'monthly',
        selectedMonth: null,
        selectedProviders: ['OpenAI'],
        selectedModels: ['GPT-5.4'],
        startDate: '2026-03-31',
        endDate: '2026-04-06',
      },
      {
        viewMode: 'daily',
        selectedMonth: '2026-04',
        selectedProviders: ['Anthropic'],
        selectedModels: [],
      },
      {
        viewMode: 'yearly',
        selectedMonth: null,
        selectedProviders: [],
        selectedModels: [],
      },
    ]

    for (const scenario of scenarios) {
      expect(
        deriveDashboardFilterData({
          sortedData: sortDashboardUsageData(dashboardFixture),
          ...scenario,
        }),
      ).toEqual(deriveLegacyFilterData(dashboardFixture, scenario))
    }
  })

  it('returns stable empty-state slices when no rows match the selected filters', () => {
    const derived = deriveDashboardFilterData({
      sortedData: sortDashboardUsageData(dashboardFixture),
      viewMode: 'daily',
      selectedMonth: '2026-04',
      selectedProviders: ['OpenAI'],
      selectedModels: ['Claude Sonnet 4.5'],
    })

    expect(derived.filteredDailyData).toEqual([])
    expect(derived.filteredData).toEqual([])
    expect(derived.dateRange).toBeNull()
    expect(derived.availableProviders).toEqual(['Anthropic', 'Google', 'OpenAI'])
    expect(derived.availableModels).toEqual(['GPT-5.4'])
  })
})

describe('sanitizeDashboardDefaultFilters', () => {
  it('keeps only persisted provider and model defaults that exist in the current dataset', () => {
    const defaults: DashboardDefaultFilters = {
      viewMode: 'monthly',
      datePreset: '30d',
      providers: ['OpenAI', 'MissingProvider'],
      models: ['GPT-5.4', 'Missing Model'],
    }

    expect(sanitizeDashboardDefaultFilters(dashboardFixture, defaults)).toEqual({
      viewMode: 'monthly',
      datePreset: '30d',
      providers: ['OpenAI'],
      models: ['GPT-5.4'],
    })
  })
})
