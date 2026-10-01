import { useMemo } from 'react'
import { resolveDashboardActivePreset } from '@/lib/dashboard-preferences'
import type { DashboardFilterBarViewModel } from '@/types/dashboard-view-model'
import { FilterBarChipFilters } from './FilterBarChipFilters'
import { FilterBarDateRange } from './FilterBarDateRange'
import { FilterBarQuickControls } from './FilterBarQuickControls'
import { Disclosure } from '@/components/ui/disclosure'
import { useTranslation } from 'react-i18next'
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
  availableSystems,
  selectedSystems,
  onToggleSystem,
  onClearSystems,
  onResetAll,
}: FilterBarProps) {
  const { t } = useTranslation()
  const activePreset = useMemo(
    () => resolveDashboardActivePreset({ selectedMonth, startDate, endDate }),
    [selectedMonth, startDate, endDate],
  )
  const hasCustomFilters =
    selectedMonth !== null ||
    selectedSystems.length > 0 ||
    selectedProviders.length > 0 ||
    selectedModels.length > 0 ||
    Boolean(startDate || endDate) ||
    viewMode !== 'daily'

  return (
    <div className="rounded-2xl border border-border/50 bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3">
        <FilterBarStatus
          selectedProviders={selectedProviders}
          selectedModels={selectedModels}
          selectedSystems={selectedSystems}
          onToggleProvider={onToggleProvider}
          onToggleModel={onToggleModel}
          onToggleSystem={onToggleSystem}
          onClearDateRange={() => {
            onStartDateChange(undefined)
            onEndDateChange(undefined)
          }}
          startDate={startDate}
          endDate={endDate}
          hasCustomFilters={hasCustomFilters}
          onResetAll={onResetAll}
        />

        <div className="min-w-0">
          <FilterBarQuickControls
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
            availableMonths={availableMonths}
            activePreset={activePreset}
            onApplyPreset={onApplyPreset}
          />
        </div>
        <Disclosure label={t('filterBar.moreFilters')} testId="filter-details">
          <FilterBarDateRange
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />

          <FilterBarChipFilters
            availableSystems={availableSystems}
            selectedSystems={selectedSystems}
            onToggleSystem={onToggleSystem}
            onClearSystems={onClearSystems}
            availableProviders={availableProviders}
            selectedProviders={selectedProviders}
            onToggleProvider={onToggleProvider}
            onClearProviders={onClearProviders}
            allModels={allModels}
            selectedModels={selectedModels}
            onToggleModel={onToggleModel}
            onClearModels={onClearModels}
          />
        </Disclosure>
      </div>
    </div>
  )
}
