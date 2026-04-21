import { vi } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import type { AppSettings, UsageData } from '@/types'

export function createUsageData(overrides: Partial<UsageData> = {}): UsageData {
  return {
    daily: [],
    totals: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      totalTokens: 0,
      requestCount: 0,
    },
    ...overrides,
  }
}

export function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    language: 'en',
    ...overrides,
  }
}

export function createFilterState(overrides: Record<string, unknown> = {}) {
  return {
    viewMode: 'daily',
    setViewMode: vi.fn(),
    selectedMonth: '2026-04',
    setSelectedMonth: vi.fn(),
    selectedProviders: ['OpenAI', 'Anthropic'],
    toggleProvider: vi.fn(),
    clearProviders: vi.fn(),
    selectedModels: ['GPT-4o'],
    toggleModel: vi.fn(),
    clearModels: vi.fn(),
    startDate: '2026-04-01',
    setStartDate: vi.fn(),
    endDate: '2026-04-20',
    setEndDate: vi.fn(),
    resetAll: vi.fn(),
    applyDefaultFilters: vi.fn(),
    applyPreset: vi.fn(),
    filteredDailyData: [],
    filteredData: [],
    availableMonths: ['2026-04'],
    availableProviders: ['OpenAI', 'Anthropic'],
    availableModels: ['GPT-4o'],
    dateRange: { start: '2026-04-01', end: '2026-04-20' },
    ...overrides,
  }
}

export function createComputedState(overrides: Record<string, unknown> = {}) {
  return {
    metrics: {
      totalCost: 0,
      totalTokens: 0,
      activeDays: 0,
      topModel: null,
      topRequestModel: null,
      topTokenModel: null,
      topModelShare: 0,
      topThreeModelsShare: 0,
      topProvider: null,
      providerCount: 0,
      hasRequestData: false,
      cacheHitRate: 0,
      costPerMillion: 0,
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      avgModelsPerEntry: 0,
      avgDailyCost: 0,
      avgRequestsPerDay: 0,
      topDay: null,
      cheapestDay: null,
      busiestWeek: null,
      weekendCostShare: null,
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreate: 0,
      totalThinking: 0,
      totalRequests: 0,
      weekOverWeekChange: null,
      requestVolatility: 0,
      modelConcentrationIndex: 0,
      providerConcentrationIndex: 0,
    },
    modelCosts: new Map(),
    providerMetrics: new Map(),
    costChartData: [],
    modelCostChartData: [],
    tokenChartData: [],
    requestChartData: [],
    weekdayData: [],
    allModels: [],
    modelPieData: [],
    tokenPieData: [],
    ...overrides,
  }
}
