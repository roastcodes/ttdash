import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
}

export function FilterBar({
  viewMode, onViewModeChange,
  selectedMonth, onMonthChange,
  availableMonths, allModels,
  selectedModels, onToggleModel,
}: FilterBarProps) {
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

      <Select value={selectedMonth ?? 'all'} onValueChange={(v) => onMonthChange(v === 'all' ? null : v)}>
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

      <div className="flex flex-wrap gap-1.5">
        {allModels.map(model => {
          const isSelected = selectedModels.includes(model)
          const color = getModelColor(model)
          return (
            <button
              key={model}
              onClick={() => onToggleModel(model)}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                'border',
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
