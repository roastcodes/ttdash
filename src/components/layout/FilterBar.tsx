import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { getModelColor, getProviderBadgeClasses, getProviderBadgeStyle } from '@/lib/model-utils'
import { formatMonthYear } from '@/lib/formatters'
import type { ViewMode } from '@/types'

interface FilterBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  availableMonths: string[]
  availableProviders: string[]
  selectedProviders: string[]
  onToggleProvider: (provider: string) => void
  onClearProviders: () => void
  allModels: string[]
  selectedModels: string[]
  onToggleModel: (model: string) => void
  onClearModels: () => void
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string | undefined) => void
  onEndDateChange: (date: string | undefined) => void
  onApplyPreset: (preset: string) => void
}

export function FilterBar({
  viewMode, onViewModeChange,
  selectedMonth, onMonthChange,
  availableMonths, availableProviders, selectedProviders,
  onToggleProvider, onClearProviders, allModels,
  selectedModels, onToggleModel, onClearModels,
  startDate, endDate,
  onStartDateChange, onEndDateChange,
  onApplyPreset,
}: FilterBarProps) {
  const { t } = useTranslation()
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Reset active preset when month or viewMode changes externally
  useEffect(() => { setActivePreset(null) }, [selectedMonth, viewMode])

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 px-3 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em]">{t('filterBar.status')}</span>
          <span className="rounded-full bg-muted/30 px-2 py-0.5">{selectedProviders.length > 0 ? t('filterBar.providersActive', { count: selectedProviders.length }) : t('common.allProviders')}</span>
          <span className="rounded-full bg-muted/30 px-2 py-0.5">{selectedModels.length > 0 ? t('filterBar.modelsActive', { count: selectedModels.length }) : t('common.allModels')}</span>
          {(startDate || endDate) && <span className="rounded-full bg-muted/30 px-2 py-0.5">{t('filterBar.dateFilterActive')}</span>}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_190px_1fr]">
          <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['daily', 'monthly', 'yearly'] as ViewMode[]).map((value) => (
                <SelectItem key={value} value={value}>{t(`viewModes.${value}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth ?? 'all'} onValueChange={(v) => { setActivePreset(null); onMonthChange(v === 'all' ? null : v) }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allMonths')}</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{formatMonthYear(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: '7d', label: t('filterBar.presets.7d') },
              { key: '30d', label: t('filterBar.presets.30d') },
              { key: 'month', label: t('filterBar.presets.month') },
              { key: 'year', label: t('filterBar.presets.year') },
              { key: 'all', label: t('filterBar.presets.all') },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => { setActivePreset(p.key); onApplyPreset(p.key) }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200 min-w-[48px]',
                  activePreset === p.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'border-border hover:bg-accent hover:border-accent'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-center">
          <input
            type="date"
            value={startDate ?? ''}
            onChange={(e) => onStartDateChange(e.target.value || undefined)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
          <span className="hidden md:inline text-xs text-muted-foreground">{t('filterBar.until')}</span>
          <input
            type="date"
            value={endDate ?? ''}
            onChange={(e) => onEndDateChange(e.target.value || undefined)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
          <button
            onClick={() => {
              onStartDateChange(undefined)
              onEndDateChange(undefined)
              setActivePreset('all')
            }}
            className="rounded-full px-3 py-2 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent hover:border-accent"
          >
            {t('filterBar.resetDateRange')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('filterBar.providers')}</span>
            <div className="flex flex-wrap gap-1.5">
          {availableProviders.map(provider => {
            const isSelected = selectedProviders.includes(provider)
            return (
              <button
                key={provider}
                onClick={() => onToggleProvider(provider)}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer border transition-all duration-200',
                  isSelected || selectedProviders.length === 0
                    ? getProviderBadgeClasses(provider)
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                style={isSelected || selectedProviders.length === 0 ? getProviderBadgeStyle(provider) : undefined}
              >
                {provider}
              </button>
            )
          })}
              {selectedProviders.length > 0 && (
                <button
                  onClick={onClearProviders}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent"
                >
                  {t('common.reset')}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('filterBar.models')}</span>
              {selectedModels.length > 0 && (
                <button
                  onClick={onClearModels}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent"
                >
                  {t('filterBar.resetModels')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allModels.map(model => {
                const isSelected = selectedModels.includes(model)
                const color = getModelColor(model)
                return (
                  <button
                    key={model}
                    onClick={() => onToggleModel(model)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer',
                      'border transition-all duration-200 hover:scale-[1.03]',
                      isSelected || selectedModels.length === 0
                        ? 'opacity-100'
                        : 'opacity-40 hover:opacity-70'
                    )}
                    style={{
                      borderColor: color,
                      backgroundColor: isSelected || selectedModels.length === 0
                        ? `${color}20`
                        : 'transparent',
                      color: color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: color }}
                    />
                    {model}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
