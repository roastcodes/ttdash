import { useTranslation } from 'react-i18next'

interface FilterBarStatusProps {
  selectedProviders: string[]
  selectedModels: string[]
  startDate: string | undefined
  endDate: string | undefined
  hasCustomFilters: boolean
  onResetAll: () => void
}

/** Renders the compact active-filter summary and global reset action. */
export function FilterBarStatus({
  selectedProviders,
  selectedModels,
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
      {(startDate || endDate) && (
        <span className="rounded-full bg-muted/30 px-2 py-0.5">
          {t('filterBar.dateFilterActive')}
        </span>
      )}
      <button
        type="button"
        onClick={() => onResetAll()}
        className="ml-auto inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition-all duration-200 hover:border-accent hover:bg-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent"
        disabled={!hasCustomFilters}
      >
        {t('filterBar.resetAll')}
      </button>
    </div>
  )
}
