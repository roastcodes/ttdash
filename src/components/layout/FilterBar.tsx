import { useState, useEffect } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { getModelColor } from '@/lib/model-utils'
import { formatMonthYear } from '@/lib/formatters'
import { VIEW_MODE_LABELS } from '@/lib/constants'
import type { ViewMode } from '@/types'

interface FilterBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  availableMonths: string[]
  allModels: string[]
  selectedModels: string[]
  onToggleModel: (model: string) => void
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string | undefined) => void
  onEndDateChange: (date: string | undefined) => void
  onApplyPreset: (preset: string) => void
}

export function FilterBar({
  viewMode, onViewModeChange,
  selectedMonth, onMonthChange,
  availableMonths, allModels,
  selectedModels, onToggleModel,
  onApplyPreset,
}: FilterBarProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Reset active preset when month or viewMode changes externally
  useEffect(() => { setActivePreset(null) }, [selectedMonth, viewMode])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap py-2 px-1">
      <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(VIEW_MODE_LABELS) as [ViewMode, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedMonth ?? 'all'} onValueChange={(v) => { setActivePreset(null); onMonthChange(v === 'all' ? null : v) }}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Monate</SelectItem>
          {availableMonths.map(m => (
            <SelectItem key={m} value={m}>{formatMonthYear(m)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1.5">
        {[
          { key: '7d', label: '7T' },
          { key: '30d', label: '30T' },
          { key: 'month', label: 'Monat' },
          { key: 'year', label: 'Jahr' },
          { key: 'all', label: 'Alle' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => { setActivePreset(p.key); onApplyPreset(p.key) }}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium border transition-all duration-200',
              activePreset === p.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-accent hover:border-accent'
            )}
          >
            {p.label}
          </button>
        ))}
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
                'border transition-all duration-200 hover:scale-105',
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
  )
}
