import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormattedValue } from '@/components/ui/formatted-value'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatCurrency, formatDate, formatPercent, formatNumber } from '@/lib/formatters'
import {
  normalizeModelName,
  getModelColor,
  getModelColorAlpha,
  getModelProvider,
  getProviderBadgeClasses,
} from '@/lib/model-utils'
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
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    const items = [...data]
    items.sort((a, b) => {
      switch (sortKey) {
        case 'date':
          return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
        case 'cost':
          return sortAsc ? a.totalCost - b.totalCost : b.totalCost - a.totalCost
        case 'tokens':
          return sortAsc ? a.totalTokens - b.totalTokens : b.totalTokens - a.totalTokens
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
  const chronological = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  )
  const benchmarkMap = useMemo(() => {
    const map = new Map<
      string,
      { prevCostDelta?: number; avgCost7?: number; avgRequests7?: number }
    >()
    chronological.forEach((day, index) => {
      const previous = index > 0 ? chronological[index - 1] : null
      const window = chronological.slice(Math.max(0, index - 7), index)
      const prevCostDelta =
        previous && previous.totalCost > 0
          ? ((day.totalCost - previous.totalCost) / previous.totalCost) * 100
          : null
      const avgCost7 =
        window.length > 0
          ? window.reduce((sum, item) => sum + item.totalCost, 0) / window.length
          : null
      const avgRequests7 =
        window.length > 0
          ? window.reduce((sum, item) => sum + item.requestCount, 0) / window.length
          : null
      map.set(day.date, {
        ...(prevCostDelta !== null ? { prevCostDelta } : {}),
        ...(avgCost7 !== null ? { avgCost7 } : {}),
        ...(avgRequests7 !== null ? { avgRequests7 } : {}),
      })
    })
    return map
  }, [chronological])

  const maxCost = useMemo(() => Math.max(...data.map((d) => d.totalCost), 0), [data])

  const summary = useMemo(() => {
    if (data.length === 0) return null
    const totalCost = data.reduce((sum, day) => sum + day.totalCost, 0)
    const totalTokens = data.reduce((sum, day) => sum + day.totalTokens, 0)
    const totalRequests = data.reduce((sum, day) => sum + day.requestCount, 0)
    const cacheShare =
      totalTokens > 0
        ? (data.reduce((sum, day) => sum + day.cacheReadTokens, 0) / totalTokens) * 100
        : 0
    const top = [...data].sort((a, b) => b.totalCost - a.totalCost)[0] ?? null
    return { totalCost, totalTokens, totalRequests, cacheShare, top }
  }, [data])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const getAriaSort = (field: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === field ? (sortAsc ? 'ascending' : 'descending') : 'none'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <InfoHeading info={FEATURE_HELP.recentDays}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {viewMode === 'monthly'
                ? t('tables.recentDays.monthsDetail')
                : viewMode === 'yearly'
                  ? t('tables.recentDays.yearsDetail')
                  : t('tables.recentDays.daysDetail')}
            </CardTitle>
          </InfoHeading>
          <span className="text-xs text-muted-foreground/70">
            {t('tables.recentDays.showing', {
              shown: displayed.length,
              total: sorted.length,
              unit: periodLabel(viewMode, true),
            })}
          </span>
        </div>
        {sorted.length > 30 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? t('tables.recentDays.showLess') : t('tables.recentDays.showAll')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('tables.recentDays.totalCost')}
              </div>
              <div className="mt-1 text-sm font-medium">
                <FormattedValue value={summary.totalCost} type="currency" />
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('tables.recentDays.totalTokens')}
              </div>
              <div className="mt-1 text-sm font-medium">
                <FormattedValue value={summary.totalTokens} type="tokens" />
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('tables.recentDays.requests')}
              </div>
              <div className="mt-1 text-sm font-medium">
                <FormattedValue value={summary.totalRequests} type="number" />
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('tables.recentDays.cacheReadShare')}
              </div>
              <div className="mt-1 text-sm font-medium">{formatPercent(summary.cacheShare, 1)}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('tables.recentDays.peak')}
              </div>
              <div className="mt-1 text-sm font-medium">
                {summary.top ? formatDate(summary.top.date) : '–'}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.top ? formatCurrency(summary.top.totalCost) : '–'}
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-2 md:hidden">
          {displayed.map((day) => {
            const costPerM = day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0
            const uniqueModels = day.modelBreakdowns
              .map((mb) => ({
                name: normalizeModelName(mb.modelName),
                provider: getModelProvider(mb.modelName),
              }))
              .filter((entry, i, a) => a.findIndex((item) => item.name === entry.name) === i)

            return (
              <button
                key={day.date}
                onClick={() => onClickDay?.(day.date)}
                className="rounded-xl border border-border/50 bg-muted/10 p-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{formatDate(day.date, 'long')}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(day.requestCount)} {t('common.requests')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      <FormattedValue value={day.totalCost} type="currency" interactive={false} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <FormattedValue value={day.totalTokens} type="tokens" interactive={false} />
                    </div>
                    {viewMode === 'daily' &&
                      benchmarkMap.get(day.date)?.prevCostDelta !== undefined && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {t('tables.recentDays.previousDay')}{' '}
                          {benchmarkMap.get(day.date)!.prevCostDelta! >= 0 ? '↑' : '↓'}
                          {Math.abs(benchmarkMap.get(day.date)!.prevCostDelta!).toFixed(0)}%
                        </div>
                      )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('common.input')}</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={day.inputTokens} type="tokens" interactive={false} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">{t('common.output')}</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={day.outputTokens} type="tokens" interactive={false} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <div className="text-muted-foreground">$/1M</div>
                    <div className="mt-1 font-mono">
                      <FormattedValue value={costPerM} type="currency" interactive={false} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uniqueModels.slice(0, 4).map(({ name, provider }) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
                      style={{
                        backgroundColor: getModelColorAlpha(name, 0.16),
                        color: getModelColor(name),
                      }}
                    >
                      <span>{name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1 py-0.5 text-[9px] leading-none',
                          getProviderBadgeClasses(provider),
                        )}
                      >
                        {provider}
                      </span>
                    </span>
                  ))}
                  {uniqueModels.length > 4 && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">
                      {t('tables.modelEfficiency.more', { count: uniqueModels.length - 4 })}
                    </span>
                  )}
                </div>
                {viewMode === 'daily' && benchmarkMap.get(day.date)?.avgCost7 !== undefined && (
                  <div className="mt-3 text-[10px] text-muted-foreground">
                    {t('tables.recentDays.avg7d')}{' '}
                    {formatCurrency(benchmarkMap.get(day.date)!.avgCost7!)} ·{' '}
                    {t('tables.recentDays.reqAvg')}{' '}
                    {benchmarkMap.get(day.date)!.avgRequests7?.toFixed(0) ?? '–'}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th
                  aria-sort={getAriaSort('date')}
                  className={cn(
                    'px-2 py-2 text-left text-xs font-medium',
                    sortKey === 'date' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('tables.recentDays.date')}{' '}
                    <ArrowUpDown
                      aria-hidden="true"
                      className={cn('h-3 w-3', sortKey === 'date' && 'text-primary')}
                    />
                  </button>
                </th>
                <th
                  aria-sort={getAriaSort('cost')}
                  className={cn(
                    'px-2 py-2 text-right text-xs font-medium',
                    sortKey === 'cost' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('cost')}
                    className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('tables.recentDays.cost')}{' '}
                    <ArrowUpDown
                      aria-hidden="true"
                      className={cn('h-3 w-3', sortKey === 'cost' && 'text-primary')}
                    />
                  </button>
                </th>
                <th
                  aria-sort={getAriaSort('tokens')}
                  className={cn(
                    'px-2 py-2 text-right text-xs font-medium',
                    sortKey === 'tokens' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('tokens')}
                    className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('tables.recentDays.tokens')}{' '}
                    <ArrowUpDown
                      aria-hidden="true"
                      className={cn('h-3 w-3', sortKey === 'tokens' && 'text-primary')}
                    />
                  </button>
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">
                  {t('common.input')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">
                  {t('common.output')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  {t('common.cacheWrite')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  {t('common.cacheRead')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden xl:table-cell">
                  {t('common.thinking')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden xl:table-cell">
                  {t('common.requestsShort')}
                </th>
                <th
                  aria-sort={getAriaSort('costPerM')}
                  className={cn(
                    'px-2 py-2 text-right text-xs font-medium',
                    sortKey === 'costPerM' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('costPerM')}
                    className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    $/1M{' '}
                    <ArrowUpDown
                      aria-hidden="true"
                      className={cn('h-3 w-3', sortKey === 'costPerM' && 'text-primary')}
                    />
                  </button>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                  {t('tables.recentDays.models')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((day) => {
                const costPerM =
                  day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0
                const intensity = maxCost > 0 ? day.totalCost / maxCost : 0
                return (
                  <tr
                    key={day.date}
                    className="border-b border-border/50 border-l-[3px] hover:bg-muted/10 transition-colors cursor-pointer active:bg-muted/20"
                    style={{ borderLeftColor: `hsla(215, 70%, 55%, ${0.2 + intensity * 0.8})` }}
                    onClick={() => onClickDay?.(day.date)}
                  >
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {formatDate(day.date, 'long')}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums relative">
                      <div
                        className="absolute inset-y-1 left-0 rounded-sm bg-primary/8 transition-all duration-300"
                        style={{ width: `${maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0}%` }}
                      />
                      <span className="relative">
                        <FormattedValue value={day.totalCost} type="currency" />
                      </span>
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
                          .map((mb) => ({
                            name: normalizeModelName(mb.modelName),
                            provider: getModelProvider(mb.modelName),
                          }))
                          .filter(
                            (entry, i, a) => a.findIndex((item) => item.name === entry.name) === i,
                          )
                          .map(({ name, provider }) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight"
                              style={{
                                backgroundColor: getModelColorAlpha(name, 0.16),
                                color: getModelColor(name),
                              }}
                            >
                              <span>{name}</span>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full border px-1 py-0.5 text-[9px] leading-none',
                                  getProviderBadgeClasses(provider),
                                )}
                              >
                                {provider}
                              </span>
                            </span>
                          ))}
                      </div>
                      {viewMode === 'daily' &&
                        benchmarkMap.get(day.date)?.avgCost7 !== undefined && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {t('tables.recentDays.previousDay')}{' '}
                            {benchmarkMap.get(day.date)?.prevCostDelta !== undefined
                              ? `${benchmarkMap.get(day.date)!.prevCostDelta! >= 0 ? '↑' : '↓'}${Math.abs(benchmarkMap.get(day.date)!.prevCostDelta!).toFixed(0)}%`
                              : '–'}{' '}
                            · {t('tables.recentDays.avg7d')}{' '}
                            {formatCurrency(benchmarkMap.get(day.date)!.avgCost7!)}
                          </div>
                        )}
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
