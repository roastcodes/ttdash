// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
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

    expect(result.current.filteredDailyData.map(entry => entry.date)).toEqual([
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

    act(() => {
      result.current.applyPreset('7d')
    })

    expect(result.current.startDate).toBe('2026-03-31')
    expect(result.current.endDate).toBe('2026-04-06')
  })
})
