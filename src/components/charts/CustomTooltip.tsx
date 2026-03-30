import { CHART_COLORS } from './chart-theme'

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (value: number, name: string) => string
}

export function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
      }}
    >
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
