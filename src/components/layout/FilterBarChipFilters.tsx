import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useModelColorHelpers } from '@/lib/model-color-context'
import { getProviderBadgeClasses, getProviderBadgeStyle } from '@/lib/model-utils'

interface FilterBarChipFiltersProps {
  availableProviders: string[]
  selectedProviders: string[]
  onToggleProvider: (provider: string) => void
  onClearProviders: () => void
  allModels: string[]
  selectedModels: string[]
  onToggleModel: (model: string) => void
  onClearModels: () => void
}

type FilterVisualState = 'selected' | 'included' | 'inactive'

function getFilterVisualState(isSelected: boolean, hasSelection: boolean): FilterVisualState {
  if (isSelected) return 'selected'
  if (!hasSelection) return 'included'
  return 'inactive'
}

/** Renders provider and model chip filters as independent filter groups. */
export function FilterBarChipFilters({
  availableProviders,
  selectedProviders,
  onToggleProvider,
  onClearProviders,
  allModels,
  selectedModels,
  onToggleModel,
  onClearModels,
}: FilterBarChipFiltersProps) {
  const { t } = useTranslation()
  const { getModelColor, getModelColorAlpha } = useModelColorHelpers()

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section
        aria-label={t('filterBar.groups.providers')}
        className="rounded-2xl border border-border/50 bg-muted/15 p-3"
      >
        <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t('filterBar.providers')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableProviders.map((provider) => {
            const isSelected = selectedProviders.includes(provider)
            const visualState = getFilterVisualState(isSelected, selectedProviders.length > 0)
            const badgeStyle = getProviderBadgeStyle(provider)
            const includedBadgeStyle = getProviderBadgeStyle(provider, {
              backgroundAlpha: 0.05,
              borderAlpha: 0.14,
            })
            return (
              <button
                key={provider}
                type="button"
                data-filter-state={visualState}
                aria-pressed={isSelected}
                onClick={() => onToggleProvider(provider)}
                className={cn(
                  'inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200',
                  visualState === 'selected'
                    ? getProviderBadgeClasses(provider)
                    : visualState === 'included'
                      ? 'hover:bg-accent'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                style={
                  visualState === 'selected'
                    ? badgeStyle
                    : visualState === 'included'
                      ? includedBadgeStyle
                      : undefined
                }
              >
                {provider}
              </button>
            )
          })}
          {selectedProviders.length > 0 && (
            <button
              type="button"
              onClick={onClearProviders}
              className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:bg-accent"
            >
              {t('common.reset')}
            </button>
          )}
        </div>
      </section>

      <section
        aria-label={t('filterBar.groups.models')}
        className="rounded-2xl border border-border/50 bg-muted/15 p-3"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t('filterBar.models')}
          </span>
          {selectedModels.length > 0 && (
            <button
              type="button"
              onClick={onClearModels}
              className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:bg-accent"
            >
              {t('filterBar.resetModels')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allModels.map((model) => {
            const isSelected = selectedModels.includes(model)
            const color = getModelColor(model)
            const visualState = getFilterVisualState(isSelected, selectedModels.length > 0)
            return (
              <button
                key={model}
                type="button"
                data-filter-state={visualState}
                aria-pressed={isSelected}
                onClick={() => onToggleModel(model)}
                className={cn(
                  'inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 text-xs font-medium',
                  'border transition-all duration-200 hover:scale-[1.03]',
                  visualState === 'selected'
                    ? 'opacity-100'
                    : visualState === 'included'
                      ? 'opacity-85'
                      : 'opacity-40 hover:opacity-70',
                )}
                style={{
                  borderColor: color,
                  backgroundColor:
                    visualState === 'selected'
                      ? getModelColorAlpha(model, 0.16)
                      : visualState === 'included'
                        ? getModelColorAlpha(model, 0.08)
                        : 'transparent',
                  color: color,
                }}
              >
                <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {model}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
