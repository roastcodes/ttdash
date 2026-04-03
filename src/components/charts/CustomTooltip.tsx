interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (value: number, name: string) => string
  pinnedEntryNames?: string[]
  showComputedTotal?: boolean
}

export function CustomTooltip({ active, payload, label, formatter, pinnedEntryNames = [], showComputedTotal = true }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  // Separate actual values from moving average (Ø) lines
  const isMA = (entry: TooltipPayloadEntry) =>
    entry.name.includes('Ø') || entry.dataKey?.toString().includes('MA7') || entry.dataKey?.toString().includes('_ma7')

  const isPinned = (entry: TooltipPayloadEntry) => pinnedEntryNames.includes(entry.name)

  const actualEntries = payload
    .filter(e => !isMA(e) && !isPinned(e))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const pinnedEntries = payload.filter(e => !isMA(e) && isPinned(e))
  const maEntries = payload.filter(e => isMA(e))

  const total = actualEntries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
  const showTotal = showComputedTotal && actualEntries.length >= 2
  const point = payload[0]?.payload ?? {}
  const focusEntry = actualEntries.length === 1 ? actualEntries[0] : pinnedEntries.length === 1 ? pinnedEntries[0] : null
  const prevValueRaw = focusEntry ? point[`${focusEntry.dataKey}Prev`] : undefined
  const prevValue = typeof prevValueRaw === 'number' ? prevValueRaw : null
  const matchingMA = focusEntry
    ? maEntries.find(entry => entry.dataKey === `${focusEntry.dataKey}MA7` || entry.dataKey === `${focusEntry.dataKey.toString().toLowerCase()}MA7`)
      ?? (maEntries.length === 1 ? maEntries[0] : null)
    : null
  const deltaVsPrevious = focusEntry && prevValue !== null
    ? focusEntry.value - prevValue
    : null
  const deltaVsAverage = focusEntry && matchingMA
    ? focusEntry.value - matchingMA.value
    : null

  return (
    <div className="max-w-[280px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="space-y-1.5">
        {actualEntries.map((entry, i) => {
          const pct = showTotal && total > 0 ? (entry.value / total) * 100 : null
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-mono font-medium text-foreground ml-auto">
                {formatter ? formatter(entry.value, entry.name) : entry.value}
              </span>
              {pct !== null && (
                <span className="text-muted-foreground/60 font-mono w-10 text-right">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
        {showTotal && (
          <>
            <div className="border-t border-border/40 my-1" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 shrink-0" />
              <span className="text-muted-foreground font-medium">Gesamt:</span>
              <span className="font-mono font-medium text-foreground ml-auto">
                {formatter ? formatter(total, 'Gesamt') : total}
              </span>
              <span className="text-muted-foreground/60 font-mono w-10 text-right">100%</span>
            </div>
          </>
        )}
        {maEntries.length > 0 && (
          <>
            <div className="border-t border-border/40 my-1" />
            {maEntries.map((entry, i) => (
              <div key={`ma-${i}`} className="flex items-center gap-2 opacity-70">
                <span
                  className="w-2 h-0.5 shrink-0 border-t border-dashed"
                  style={{ borderColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-mono font-medium text-foreground ml-auto">
                  {formatter ? formatter(entry.value, entry.name) : entry.value}
                </span>
              </div>
            ))}
          </>
        )}
        {pinnedEntries.length > 0 && (
          <>
            <div className="border-t border-border/40 my-1" />
            {pinnedEntries.map((entry, i) => (
              <div key={`pinned-${i}`} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-mono font-medium text-foreground ml-auto">
                  {formatter ? formatter(entry.value, entry.name) : entry.value}
                </span>
              </div>
            ))}
          </>
        )}
        {(deltaVsPrevious !== null || deltaVsAverage !== null) && (
          <>
            <div className="border-t border-border/40 my-1" />
            {deltaVsPrevious !== null && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 shrink-0" />
                <span className="text-muted-foreground">vs. vorher:</span>
                <span className="font-mono font-medium text-foreground ml-auto">
                  {(deltaVsPrevious >= 0 ? '+' : '')}{formatter ? formatter(deltaVsPrevious, 'Delta') : deltaVsPrevious}
                </span>
              </div>
            )}
            {deltaVsAverage !== null && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 shrink-0" />
                <span className="text-muted-foreground">vs. Ø:</span>
                <span className="font-mono font-medium text-foreground ml-auto">
                  {(deltaVsAverage >= 0 ? '+' : '')}{formatter ? formatter(deltaVsAverage, 'Delta') : deltaVsAverage}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
