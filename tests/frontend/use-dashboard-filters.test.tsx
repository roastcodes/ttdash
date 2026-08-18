// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { resolveDashboardPresetRange } from '@/lib/dashboard-preferences'
import type { DashboardDefaultFilters, UsageSystem } from '@/types'
import { dashboardFixture } from '../fixtures/usage-data'

describe('useDashboardFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps provider and model filters in sync and aggregates selected months', () => {
    const { result } = renderHook(() => useDashboardFilters(dashboardFixture))

    expect(result.current.availableProviders).toEqual(['Anthropic', 'Google', 'OpenAI'])

    act(() => {
      result.current.toggleProvider('OpenAI')
    })

    expect(result.current.filteredDailyData.map((entry) => entry.date)).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-06',
    ])

    act(() => {
      result.current.toggleModel('GPT-5.4')
    })

    expect(result.current.selectedModels).toEqual(['GPT-5.4'])

    act(() => {
      result.current.toggleProvider('Anthropic')
    })

    expect(result.current.selectedProviders).toEqual(['OpenAI', 'Anthropic'])
    expect(result.current.selectedModels).toEqual([])

    act(() => {
      result.current.setSelectedMonth('2026-03')
      result.current.setViewMode('monthly')
    })

    expect(result.current.filteredData).toHaveLength(1)
    expect(result.current.filteredData[0]).toMatchObject({
      date: '2026-03',
      totalCost: 16,
      _aggregatedDays: 2,
    })
  })

  it('applies rolling date presets relative to the local current day', () => {
    const { result } = renderHook(() => useDashboardFilters(dashboardFixture))
    const sevenDayRange = resolveDashboardPresetRange('7d', new Date())

    act(() => {
      result.current.applyPreset('7d')
    })

    expect({
      startDate: result.current.startDate,
      endDate: result.current.endDate,
    }).toEqual(sevenDayRange)
  })

  it('hydrates from external default filters and restores them on reset', () => {
    const defaults: DashboardDefaultFilters = {
      viewMode: 'monthly',
      datePreset: '30d',
      systems: [],
      providers: ['OpenAI'],
      models: ['GPT-5.4'],
    }

    const { result } = renderHook(
      ({ filters }) => useDashboardFilters(dashboardFixture, [], filters),
      { initialProps: { filters: defaults } },
    )

    expect(result.current.viewMode).toBe('monthly')
    expect(result.current.selectedProviders).toEqual(['OpenAI'])
    expect(result.current.selectedModels).toEqual(['GPT-5.4'])
    expect({
      startDate: result.current.startDate,
      endDate: result.current.endDate,
    }).toEqual(resolveDashboardPresetRange('30d', new Date()))

    act(() => {
      result.current.toggleProvider('Anthropic')
      result.current.applyPreset('7d')
    })

    expect(result.current.selectedProviders).toEqual(['OpenAI', 'Anthropic'])
    expect(result.current.startDate).toBe(resolveDashboardPresetRange('7d', new Date()).startDate)

    act(() => {
      result.current.resetAll()
    })

    expect(result.current.viewMode).toBe('monthly')
    expect(result.current.selectedProviders).toEqual(['OpenAI'])
    expect(result.current.selectedModels).toEqual(['GPT-5.4'])
    expect({
      startDate: result.current.startDate,
      endDate: result.current.endDate,
    }).toEqual(resolveDashboardPresetRange('30d', new Date()))
  })

  it('applies persisted defaults when matching data becomes available later', () => {
    const defaults: DashboardDefaultFilters = {
      viewMode: 'daily',
      datePreset: 'all',
      systems: [],
      providers: ['OpenAI'],
      models: ['GPT-5.4'],
    }

    const { result, rerender } = renderHook(
      ({ data, filters }) => useDashboardFilters(data, [], filters),
      {
        initialProps: {
          data: [],
          filters: defaults,
        },
      },
    )

    expect(result.current.selectedProviders).toEqual([])
    expect(result.current.selectedModels).toEqual([])

    rerender({
      data: dashboardFixture,
      filters: defaults,
    })

    expect(result.current.selectedProviders).toEqual(['OpenAI'])
    expect(result.current.selectedModels).toEqual(['GPT-5.4'])
  })

  it('switches between one system and the combined multi-system view', () => {
    const localDay = dashboardFixture[0]!
    const remoteDay = {
      ...localDay,
      totalCost: 2,
      modelBreakdowns: localDay.modelBreakdowns.map((model) => ({ ...model, cost: 1 })),
    }
    const totalsFor = (day: typeof localDay) => ({
      inputTokens: day.inputTokens,
      outputTokens: day.outputTokens,
      cacheCreationTokens: day.cacheCreationTokens,
      cacheReadTokens: day.cacheReadTokens,
      thinkingTokens: day.thinkingTokens,
      totalTokens: day.totalTokens,
      totalCost: day.totalCost,
      requestCount: day.requestCount,
    })
    const systems: UsageSystem[] = [
      {
        id: 'workstation-a',
        hostname: 'workstation-a',
        filename: 'ttdash-system-workstation-a.json',
        isLocal: true,
        exportedAt: null,
        data: { daily: [localDay], totals: totalsFor(localDay) },
      },
      {
        id: 'workstation-b',
        hostname: 'workstation-b',
        filename: 'ttdash-system-workstation-b.json',
        isLocal: false,
        exportedAt: '2026-08-18T08:00:00.000Z',
        data: { daily: [remoteDay], totals: totalsFor(remoteDay) },
      },
    ]
    const { result } = renderHook(() => useDashboardFilters([], systems))

    expect(result.current.filteredDailyData[0]?.totalCost).toBe(12)
    act(() => result.current.toggleSystem('workstation-b'))
    expect(result.current.selectedSystems).toEqual(['workstation-b'])
    expect(result.current.filteredDailyData[0]?.totalCost).toBe(2)
    act(() => result.current.clearSystems())
    expect(result.current.filteredDailyData[0]?.totalCost).toBe(12)
  })

  it('uses only valid system IDs when applying changed defaults', () => {
    const day = dashboardFixture[0]!
    const systems: UsageSystem[] = [
      {
        id: 'workstation-a',
        hostname: 'workstation-a',
        filename: 'ttdash-system-workstation-a.json',
        isLocal: true,
        exportedAt: null,
        data: { daily: [day] },
      },
    ]
    const defaults: DashboardDefaultFilters = {
      viewMode: 'daily',
      datePreset: 'all',
      systems: ['missing-system'],
      providers: [],
      models: [],
    }
    const { result } = renderHook(() => useDashboardFilters([], systems, defaults))

    act(() => result.current.applyDefaultFilters(defaults))

    expect(result.current.selectedSystems).toEqual([])
  })
})
