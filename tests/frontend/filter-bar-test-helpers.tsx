import type { ComponentProps } from 'react'
import { renderWithAppProviders } from '../test-utils'
import { FilterBar } from '@/components/layout/FilterBar'

type FilterBarProps = ComponentProps<typeof FilterBar>

export function buildFilterBarProps(overrides: Partial<FilterBarProps> = {}): FilterBarProps {
  const noop = () => {}

  return {
    viewMode: 'daily',
    onViewModeChange: noop,
    selectedMonth: null,
    onMonthChange: noop,
    availableMonths: ['2026-03', '2026-04'],
    availableProviders: [],
    selectedProviders: [],
    onToggleProvider: noop,
    onClearProviders: noop,
    allModels: [],
    selectedModels: [],
    onToggleModel: noop,
    onClearModels: noop,
    startDate: undefined,
    endDate: undefined,
    onStartDateChange: noop,
    onEndDateChange: noop,
    onApplyPreset: noop,
    onResetAll: noop,
    ...overrides,
  }
}

export function renderFilterBar(overrides: Partial<FilterBarProps> = {}) {
  return renderWithAppProviders(<FilterBar {...buildFilterBarProps(overrides)} />)
}
