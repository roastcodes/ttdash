import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDate } from '@/lib/formatters'
import { normalizeModelName, getModelColor } from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import { ArrowUpDown } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface RecentDaysProps {
  data: DailyUsage[]
  onClickDay?: (date: string) => void
}

type SortKey = 'date' | 'cost' | 'tokens' | 'costPerM'

export function RecentDays({ data, onClickDay }: RecentDaysProps) {
  const [showAll, setShowAll] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    const items = [...data]
    items.sort((a, b) => {
      switch (sortKey) {
        case 'date': return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
        case 'cost': return sortAsc ? a.totalCost - b.totalCost : b.totalCost - a.totalCost
        case 'tokens': return sortAsc ? a.totalTokens - b.totalTokens : b.totalTokens - a.totalTokens
        case 'costPerM': {
          const aPerM = a.totalTokens > 0 ? a.totalCost / (a.totalTokens / 1e6) : 0
          const bPerM = b.totalTokens > 0 ? b.totalCost / (b.totalTokens / 1e6) : 0
          return sortAsc ? aPerM - bPerM : bPerM - aPerM
        }
      }
    })
    return items
  }, [data, sortKey, sortAsc])

  const displayed = showAll ? sorted : sorted.slice(0, 30)

  const maxCost = useMemo(
    () => Math.max(...data.map(d => d.totalCost), 0),
    [data]
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Letzte Tage im Detail
          </CardTitle>
          <span className="text-xs text-muted-foreground/70">
            Zeige {displayed.length} von {sorted.length} Tagen
          </span>
        </div>
        {sorted.length > 30 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Weniger anzeigen' : 'Alle anzeigen'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className={cn("px-2 py-2 text-left text-xs font-medium cursor-pointer hover:text-foreground transition-colors", sortKey === 'date' ? 'text-foreground' : 'text-muted-foreground')} onClick={() => handleSort('date')}>
                  <span className="inline-flex items-center gap-1">Datum <ArrowUpDown className={cn("h-3 w-3", sortKey === 'date' && "text-primary")} /></span>
                </th>
                <th className={cn("px-2 py-2 text-right text-xs font-medium cursor-pointer hover:text-foreground transition-colors", sortKey === 'cost' ? 'text-foreground' : 'text-muted-foreground')} onClick={() => handleSort('cost')}>
                  <span className="inline-flex items-center gap-1">Kosten <ArrowUpDown className={cn("h-3 w-3", sortKey === 'cost' && "text-primary")} /></span>
                </th>
                <th className={cn("px-2 py-2 text-right text-xs font-medium cursor-pointer hover:text-foreground transition-colors", sortKey === 'tokens' ? 'text-foreground' : 'text-muted-foreground')} onClick={() => handleSort('tokens')}>
                  <span className="inline-flex items-center gap-1">Tokens <ArrowUpDown className={cn("h-3 w-3", sortKey === 'tokens' && "text-primary")} /></span>
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Input</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Output</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Cache Write</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Cache Read</th>
                <th className={cn("px-2 py-2 text-right text-xs font-medium cursor-pointer hover:text-foreground transition-colors", sortKey === 'costPerM' ? 'text-foreground' : 'text-muted-foreground')} onClick={() => handleSort('costPerM')}>
                  <span className="inline-flex items-center gap-1">$/1M <ArrowUpDown className={cn("h-3 w-3", sortKey === 'costPerM' && "text-primary")} /></span>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Modelle</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(day => {
                const costPerM = day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0
                const intensity = maxCost > 0 ? day.totalCost / maxCost : 0
                return (
                  <tr
                    key={day.date}
                    className="border-b border-border/50 border-l-[3px] hover:bg-muted/10 transition-colors cursor-pointer active:bg-muted/20"
                    style={{ borderLeftColor: `hsla(215, 70%, 55%, ${0.2 + intensity * 0.8})` }}
                    onClick={() => onClickDay?.(day.date)}
                  >
                    <td className="px-2 py-2.5 whitespace-nowrap">{formatDate(day.date, 'long')}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums relative">
                      <div className="absolute inset-y-1 left-0 rounded-sm bg-primary/8 transition-all duration-300" style={{ width: `${maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0}%` }} />
                      <span className="relative"><FormattedValue value={day.totalCost} type="currency" /></span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                      <FormattedValue value={day.totalTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden md:table-cell">
                      <FormattedValue value={day.inputTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden md:table-cell">
                      <FormattedValue value={day.outputTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden lg:table-cell">
                      <FormattedValue value={day.cacheCreationTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden lg:table-cell">
                      <FormattedValue value={day.cacheReadTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                      <FormattedValue value={costPerM} type="currency" />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {day.modelBreakdowns
                          .map(mb => normalizeModelName(mb.modelName))
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map(name => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
                              style={{
                                backgroundColor: `${getModelColor(name)}20`,
                                color: getModelColor(name),
                              }}
                            >
                              {name}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
