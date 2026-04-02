import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatDate, formatPercent } from '@/lib/formatters'
import { normalizeModelName, getModelColor, getModelProvider, getProviderBadgeClasses } from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import { ArrowUpDown } from 'lucide-react'
import { periodLabel } from '@/lib/formatters'
import type { DailyUsage, ViewMode } from '@/types'

interface RecentDaysProps {
  data: DailyUsage[]
  onClickDay?: (date: string) => void
  viewMode?: ViewMode
}

type SortKey = 'date' | 'cost' | 'tokens' | 'costPerM'

export function RecentDays({ data, onClickDay, viewMode = 'daily' }: RecentDaysProps) {
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

  const summary = useMemo(() => {
    if (data.length === 0) return null
    const totalCost = data.reduce((sum, day) => sum + day.totalCost, 0)
    const totalTokens = data.reduce((sum, day) => sum + day.totalTokens, 0)
    const totalRequests = data.reduce((sum, day) => sum + day.requestCount, 0)
    const cacheShare = totalTokens > 0 ? data.reduce((sum, day) => sum + day.cacheReadTokens, 0) / totalTokens * 100 : 0
    const top = [...data].sort((a, b) => b.totalCost - a.totalCost)[0] ?? null
    return { totalCost, totalTokens, totalRequests, cacheShare, top }
  }, [data])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {viewMode === 'monthly' ? 'Monate im Detail' : viewMode === 'yearly' ? 'Jahre im Detail' : 'Letzte Tage im Detail'}
          </CardTitle>
          <span className="text-xs text-muted-foreground/70">
            Zeige {displayed.length} von {sorted.length} {periodLabel(viewMode, true)}
          </span>
        </div>
        {sorted.length > 30 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Weniger anzeigen' : 'Alle anzeigen'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Gesamtkosten</div>
              <div className="mt-1 text-sm font-medium"><FormattedValue value={summary.totalCost} type="currency" /></div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total Tokens</div>
              <div className="mt-1 text-sm font-medium"><FormattedValue value={summary.totalTokens} type="tokens" /></div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Requests</div>
              <div className="mt-1 text-sm font-medium"><FormattedValue value={summary.totalRequests} type="number" /></div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cache Read Anteil</div>
              <div className="mt-1 text-sm font-medium">{formatPercent(summary.cacheShare, 1)}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Peak</div>
              <div className="mt-1 text-sm font-medium">{summary.top ? formatDate(summary.top.date) : '–'}</div>
              <div className="text-xs text-muted-foreground">{summary.top ? `${summary.top.totalCost.toFixed(2)} USD` : '–'}</div>
            </div>
          </div>
        )}
        <div className="grid gap-2 md:hidden">
          {displayed.map(day => {
            const costPerM = day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0
            const uniqueModels = day.modelBreakdowns
              .map(mb => ({ name: normalizeModelName(mb.modelName), provider: getModelProvider(mb.modelName) }))
              .filter((entry, i, a) => a.findIndex(item => item.name === entry.name) === i)

            return (
              <button
                key={day.date}
                onClick={() => onClickDay?.(day.date)}
                className="rounded-xl border border-border/50 bg-muted/10 p-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{formatDate(day.date, 'long')}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{day.requestCount.toLocaleString('de-CH')} Requests</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold"><FormattedValue value={day.totalCost} type="currency" /></div>
                    <div className="text-xs text-muted-foreground"><FormattedValue value={day.totalTokens} type="tokens" /></div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">Input</div>
                    <div className="mt-1 font-mono"><FormattedValue value={day.inputTokens} type="tokens" /></div>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">Output</div>
                    <div className="mt-1 font-mono"><FormattedValue value={day.outputTokens} type="tokens" /></div>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">$/1M</div>
                    <div className="mt-1 font-mono"><FormattedValue value={costPerM} type="currency" /></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uniqueModels.slice(0, 4).map(({ name, provider }) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
                      style={{
                        backgroundColor: `${getModelColor(name)}20`,
                        color: getModelColor(name),
                      }}
                    >
                      <span>{name}</span>
                      <span className={cn('inline-flex items-center rounded-full border px-1 py-0.5 text-[9px] leading-none', getProviderBadgeClasses(provider))}>
                        {provider}
                      </span>
                    </span>
                  ))}
                  {uniqueModels.length > 4 && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">
                      +{uniqueModels.length - 4} weitere
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden xl:table-cell">Thinking</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden xl:table-cell">Req</th>
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
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden xl:table-cell">
                      <FormattedValue value={day.thinkingTokens} type="tokens" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums hidden xl:table-cell">
                      <FormattedValue value={day.requestCount} type="number" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                      <FormattedValue value={costPerM} type="currency" />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {day.modelBreakdowns
                          .map(mb => ({ name: normalizeModelName(mb.modelName), provider: getModelProvider(mb.modelName) }))
                          .filter((entry, i, a) => a.findIndex(item => item.name === entry.name) === i)
                          .map(({ name, provider }) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
                              style={{
                                backgroundColor: `${getModelColor(name)}20`,
                                color: getModelColor(name),
                              }}
                            >
                              <span>{name}</span>
                              <span className={cn('inline-flex items-center rounded-full border px-1 py-0.5 text-[9px] leading-none', getProviderBadgeClasses(provider))}>
                                {provider}
                              </span>
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
