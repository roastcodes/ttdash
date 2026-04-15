import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChartLegendEntry {
  id?: string | number
  dataKey?: string | number
  color?: string
  value?: string | number
}

interface ChartLegendProps {
  payload?: ChartLegendEntry[]
  className?: string
  renderLabel?: (entry: ChartLegendEntry) => ReactNode
}

/** Renders a compact responsive legend for Recharts payload items. */
export function ChartLegend({ payload, className, renderLabel }: ChartLegendProps) {
  if (!payload?.length) return null

  return (
    <div className={cn('mt-3 pb-1', className)}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 pr-2">
        {payload.map((entry, index) => {
          const color = typeof entry.color === 'string' ? entry.color : 'currentColor'
          const label = String(entry.value ?? '')
          const renderedLabel = renderLabel ? renderLabel(entry) : label
          const key = entry.id ?? entry.dataKey ?? `${label}-${color}-${index}`

          return (
            <div key={String(key)} className="inline-flex min-w-0 items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 break-words text-muted-foreground">{renderedLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
