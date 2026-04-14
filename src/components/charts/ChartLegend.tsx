interface ChartLegendEntry {
  color?: string
  value?: string | number
}

export function ChartLegend({ payload }: { payload?: ChartLegendEntry[] }) {
  if (!payload?.length) return null

  return (
    <div className="mt-3 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-3 pr-2">
        {payload.map((entry) => {
          const color = typeof entry.color === 'string' ? entry.color : 'currentColor'
          const label = String(entry.value ?? '')

          return (
            <div key={`${label}-${color}`} className="inline-flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="whitespace-nowrap text-muted-foreground">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
