import { fireEvent, screen } from '@testing-library/react'
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
    availableSystems: [],
    selectedSystems: [],
    onToggleSystem: noop,
    onClearSystems: noop,
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
  const result = renderWithAppProviders(<FilterBar {...buildFilterBarProps(overrides)} />, {
    motionPreference: 'always',
  })
  fireEvent.click(screen.getByRole('button', { name: /More filters|Weitere Filter/ }))
  return result
}
