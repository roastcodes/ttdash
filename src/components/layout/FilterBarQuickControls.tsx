import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { formatMonthYear } from '@/lib/formatters'
import type { DashboardDatePreset, ViewMode } from '@/types'

interface FilterBarQuickControlsProps {
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  selectedMonth: string | null
  onMonthChange: (value: string | null) => void
  availableMonths: string[]
  activePreset: DashboardDatePreset | null
  onApplyPreset: (preset: DashboardDatePreset) => void
}

/** Renders view mode, month focus, and quick date presets. */
export function FilterBarQuickControls({
  viewMode,
  onViewModeChange,
  selectedMonth,
  onMonthChange,
  availableMonths,
  activePreset,
  onApplyPreset,
}: FilterBarQuickControlsProps) {
  const { t } = useTranslation()
  const presets = [
    { key: '7d', label: t('filterBar.presets.7d') },
    { key: '30d', label: t('filterBar.presets.30d') },
    { key: 'month', label: t('filterBar.presets.month') },
    { key: 'year', label: t('filterBar.presets.year') },
    { key: 'all', label: t('filterBar.presets.all') },
  ] satisfies Array<{ key: DashboardDatePreset; label: string }>

  return (
    <section
      aria-label={t('filterBar.groups.time')}
      className="rounded-2xl border border-border/50 bg-muted/15 p-3"
    >
      <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t('filterBar.groups.time')}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_190px_1fr]">
        <Select value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
          <SelectTrigger className="w-full" aria-label={t('filterBar.viewModeLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['daily', 'monthly', 'yearly'] as ViewMode[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`viewModes.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMonth ?? 'all'}
          onValueChange={(value) => onMonthChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full" aria-label={t('filterBar.focusMonthLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.allMonths')}</SelectItem>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonthYear(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={activePreset === preset.key}
              onClick={() => onApplyPreset(preset.key)}
              className={cn(
                'min-w-[48px] rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                activePreset === preset.key
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'border-border hover:border-accent hover:bg-accent',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
