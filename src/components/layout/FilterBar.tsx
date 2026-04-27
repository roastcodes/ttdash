import { useMemo } from 'react'
import { resolveDashboardActivePreset } from '@/lib/dashboard-preferences'
import type { DashboardFilterBarViewModel } from '@/types/dashboard-view-model'
import { FilterBarChipFilters } from './FilterBarChipFilters'
import { FilterBarDateRange } from './FilterBarDateRange'
import { FilterBarQuickControls } from './FilterBarQuickControls'
import { FilterBarStatus } from './FilterBarStatus'

type FilterBarProps = DashboardFilterBarViewModel

/** Renders the dashboard filter shell and composes focused filter control groups. */
export function FilterBar({
  viewMode,
  onViewModeChange,
  selectedMonth,
  onMonthChange,
  availableMonths,
  availableProviders,
  selectedProviders,
  onToggleProvider,
  onClearProviders,
  allModels,
  selectedModels,
  onToggleModel,
  onClearModels,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyPreset,
  onResetAll,
}: FilterBarProps) {
  const activePreset = useMemo(
    () => resolveDashboardActivePreset({ selectedMonth, startDate, endDate }),
    [selectedMonth, startDate, endDate],
  )
  const hasCustomFilters =
    selectedMonth !== null ||
    selectedProviders.length > 0 ||
    selectedModels.length > 0 ||
    Boolean(startDate || endDate) ||
    viewMode !== 'daily'

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 px-3 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <FilterBarStatus
          selectedProviders={selectedProviders}
          selectedModels={selectedModels}
          startDate={startDate}
          endDate={endDate}
          hasCustomFilters={hasCustomFilters}
          onResetAll={onResetAll}
        />

        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <FilterBarQuickControls
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
            availableMonths={availableMonths}
            activePreset={activePreset}
            onApplyPreset={onApplyPreset}
          />
          <FilterBarDateRange
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
        </div>

        <FilterBarChipFilters
          availableProviders={availableProviders}
          selectedProviders={selectedProviders}
          onToggleProvider={onToggleProvider}
          onClearProviders={onClearProviders}
          allModels={allModels}
          selectedModels={selectedModels}
          onToggleModel={onToggleModel}
          onClearModels={onClearModels}
        />
      </div>
    </div>
  )
}
