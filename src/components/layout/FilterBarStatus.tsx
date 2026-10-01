import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface FilterBarStatusProps {
  selectedProviders: string[]
  selectedModels: string[]
  selectedSystems: string[]
  onToggleProvider: (provider: string) => void
  onToggleModel: (model: string) => void
  onToggleSystem: (system: string) => void
  onClearDateRange: () => void
  startDate: string | undefined
  endDate: string | undefined
  hasCustomFilters: boolean
  onResetAll: () => void
}

/** Renders the compact active-filter summary and global reset action. */
export function FilterBarStatus({
  selectedProviders,
  selectedModels,
  selectedSystems,
  onToggleProvider,
  onToggleModel,
  onToggleSystem,
  onClearDateRange,
  startDate,
  endDate,
  hasCustomFilters,
  onResetAll,
}: FilterBarStatusProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className="font-semibold tracking-[0.14em] uppercase">{t('filterBar.status')}</span>
      <span className="rounded-full bg-muted/30 px-2 py-0.5">
        {selectedProviders.length > 0
          ? t('filterBar.providersActive', { count: selectedProviders.length })
          : t('common.allProviders')}
      </span>
      <span className="rounded-full bg-muted/30 px-2 py-0.5">
        {selectedModels.length > 0
          ? t('filterBar.modelsActive', { count: selectedModels.length })
          : t('common.allModels')}
      </span>
      {[
        ...selectedProviders.map((label) => ({
          key: `provider-${label}`,
          label,
          remove: () => onToggleProvider(label),
        })),
        ...selectedModels.map((label) => ({
          key: `model-${label}`,
          label,
          remove: () => onToggleModel(label),
        })),
        ...selectedSystems.map((label) => ({
          key: `system-${label}`,
          label,
          remove: () => onToggleSystem(label),
        })),
        ...(startDate || endDate
          ? [
              {
                key: 'date',
                label: `${t('filterBar.dateFilterActive')} · ${startDate ?? '…'} — ${endDate ?? '…'}`,
                remove: onClearDateRange,
              },
            ]
          : []),
      ].map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={t('filterBar.removeFilter', { label: chip.label })}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/20 bg-primary/8 px-2.5 text-xs text-foreground transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-8"
        >
          {chip.label}
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onResetAll()}
        className="ml-auto inline-flex min-h-11 items-center rounded-lg border border-border px-2.5 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-accent disabled:opacity-40 sm:min-h-8"
        disabled={!hasCustomFilters}
      >
        {t('filterBar.resetAll')}
      </button>
    </div>
  )
}
