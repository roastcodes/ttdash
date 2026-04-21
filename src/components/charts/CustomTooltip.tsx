import { useTranslation } from 'react-i18next'

/** Describes one Recharts tooltip payload entry consumed by the shared tooltip surface. */
export interface TooltipPayloadEntry {
  name: string
  value: number | string | null | undefined
  color: string
  dataKey: string | number
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (value: number, name: string) => string
  pinnedEntryNames?: string[]
  showComputedTotal?: boolean
  hideZeroValues?: boolean
}

/** Renders the shared chart tooltip surface. */
export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  pinnedEntryNames = [],
  showComputedTotal = true,
  hideZeroValues = false,
}: CustomTooltipProps) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null

  const getNumericValue = (value: TooltipPayloadEntry['value']) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    return null
  }

  const formatEntryValue = (entry: TooltipPayloadEntry) => {
    const numericValue = getNumericValue(entry.value)

    if (numericValue !== null && formatter) {
      return formatter(numericValue, entry.name)
    }

    return entry.value ?? ''
  }

  // Separate actual values from moving average (Ø) lines
  const isMA = (entry: TooltipPayloadEntry) =>
    entry.name.includes('Ø') ||
    entry.dataKey?.toString().includes('MA7') ||
    entry.dataKey?.toString().includes('_ma7')

  const isPinned = (entry: TooltipPayloadEntry) => pinnedEntryNames.includes(entry.name)
  const hasNonZeroValue = (entry: TooltipPayloadEntry) =>
    !hideZeroValues || Math.abs(getNumericValue(entry.value) ?? 0) > 0.0001

  const actualEntries = payload
    .filter((e) => !isMA(e) && !isPinned(e) && hasNonZeroValue(e))
    .sort(
      (a, b) =>
        (getNumericValue(b.value) ?? Number.NEGATIVE_INFINITY) -
        (getNumericValue(a.value) ?? Number.NEGATIVE_INFINITY),
    )
  const pinnedEntries = payload.filter((e) => !isMA(e) && isPinned(e) && hasNonZeroValue(e))
  const maEntries = payload.filter((e) => isMA(e))

  const numericActualEntries = actualEntries.filter(
    (entry) => getNumericValue(entry.value) !== null,
  )
  const total = numericActualEntries.reduce(
    (sum, entry) => sum + (getNumericValue(entry.value) ?? 0),
    0,
  )
  const showTotal = showComputedTotal && numericActualEntries.length >= 2
  const point = payload[0]?.payload ?? {}
  const focusEntry =
    numericActualEntries.length === 1
      ? numericActualEntries[0]
      : pinnedEntries.filter((entry) => getNumericValue(entry.value) !== null).length === 1
        ? pinnedEntries.filter((entry) => getNumericValue(entry.value) !== null)[0]
        : null
  const prevValueRaw = focusEntry ? point[`${focusEntry.dataKey.toString()}Prev`] : undefined
  const prevValue =
    typeof prevValueRaw === 'number'
      ? prevValueRaw
      : typeof prevValueRaw === 'string' && prevValueRaw.trim() !== ''
        ? Number(prevValueRaw)
        : null
  const matchingMA = focusEntry
    ? (maEntries.find(
        (entry) =>
          entry.dataKey === `${focusEntry.dataKey}MA7` ||
          entry.dataKey === `${focusEntry.dataKey.toString().toLowerCase()}MA7`,
      ) ?? (maEntries.length === 1 ? maEntries[0] : null))
    : null
  const focusEntryValue = focusEntry ? getNumericValue(focusEntry.value) : null
  const matchingMAValue = matchingMA ? getNumericValue(matchingMA.value) : null
  const deltaVsPrevious =
    focusEntryValue !== null && prevValue !== null && Number.isFinite(prevValue)
      ? focusEntryValue - prevValue
      : null
  const deltaVsAverage =
    focusEntryValue !== null && matchingMAValue !== null ? focusEntryValue - matchingMAValue : null
  const totalLabel = t('customTooltip.total')
  const deltaLabel = t('customTooltip.delta')

  return (
    <div className="max-w-[280px] rounded-lg border border-border/50 bg-popover/90 p-3 text-xs shadow-lg backdrop-blur-xl">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {actualEntries.map((entry, i) => {
          const entryNumericValue = getNumericValue(entry.value)
          const pct =
            showTotal && total > 0 && entryNumericValue !== null
              ? (entryNumericValue / total) * 100
              : null
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="ml-auto font-mono font-medium text-foreground">
                {formatEntryValue(entry)}
              </span>
              {pct !== null && (
                <span className="w-10 text-right font-mono text-muted-foreground/60">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
        {showTotal && (
          <>
            <div className="my-1 border-t border-border/40" />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0" />
              <span className="font-medium text-muted-foreground">{totalLabel}:</span>
              <span className="ml-auto font-mono font-medium text-foreground">
                {formatter ? formatter(total, totalLabel) : total}
              </span>
              <span className="w-10 text-right font-mono text-muted-foreground/60">100%</span>
            </div>
          </>
        )}
        {maEntries.length > 0 && (
          <>
            <div className="my-1 border-t border-border/40" />
            {maEntries.map((entry, i) => (
              <div key={`ma-${i}`} className="flex items-center gap-2 opacity-70">
                <span
                  className="h-0.5 w-2 shrink-0 border-t border-dashed"
                  style={{ borderColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {formatEntryValue(entry)}
                </span>
              </div>
            ))}
          </>
        )}
        {pinnedEntries.length > 0 && (
          <>
            <div className="my-1 border-t border-border/40" />
            {pinnedEntries.map((entry, i) => (
              <div key={`pinned-${i}`} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {formatEntryValue(entry)}
                </span>
              </div>
            ))}
          </>
        )}
        {(deltaVsPrevious !== null || deltaVsAverage !== null) && (
          <>
            <div className="my-1 border-t border-border/40" />
            {deltaVsPrevious !== null && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0" />
                <span className="text-muted-foreground">{t('customTooltip.vsPrevious')}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {deltaVsPrevious >= 0 ? '+' : ''}
                  {formatter ? formatter(deltaVsPrevious, deltaLabel) : deltaVsPrevious}
                </span>
              </div>
            )}
            {deltaVsAverage !== null && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0" />
                <span className="text-muted-foreground">{t('customTooltip.vsAverage')}:</span>
                <span className="ml-auto font-mono font-medium text-foreground">
                  {deltaVsAverage >= 0 ? '+' : ''}
                  {formatter ? formatter(deltaVsAverage, deltaLabel) : deltaVsAverage}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
