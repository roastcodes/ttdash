import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedValue } from '@/components/ui/formatted-value'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { FEATURE_HELP } from '@/lib/help-content'
import {
  formatPercent,
  formatTokens,
  periodLabel,
  periodUnit,
  formatNumber,
} from '@/lib/formatters'
import { getProviderBadgeClasses } from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import { ArrowUpDown } from 'lucide-react'
import type { AggregateMetrics, ViewMode } from '@/types'

interface ProviderRow extends AggregateMetrics {
  name: string
  share: number
  costPerRequest: number
  costPerMillion: number
  cacheShare: number
}

interface ProviderEfficiencyProps {
  providerMetrics: Map<string, AggregateMetrics>
  totalCost: number
  viewMode?: ViewMode
}

type SortKey =
  | 'cost'
  | 'share'
  | 'requests'
  | 'tokens'
  | 'costPerRequest'
  | 'costPerMillion'
  | 'cacheShare'

/** Renders the sortable provider efficiency table. */
export function ProviderEfficiency({
  providerMetrics,
  totalCost,
  viewMode = 'daily',
}: ProviderEfficiencyProps) {
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortAsc, setSortAsc] = useState(false)

  const rows = useMemo<ProviderRow[]>(
    () =>
      Array.from(providerMetrics.entries()).map(([name, value]) => ({
        name,
        ...value,
        share: totalCost > 0 ? (value.cost / totalCost) * 100 : 0,
        costPerRequest: value.requests > 0 ? value.cost / value.requests : 0,
        costPerMillion: value.tokens > 0 ? value.cost / (value.tokens / 1_000_000) : 0,
        cacheShare: value.tokens > 0 ? (value.cacheRead / value.tokens) * 100 : 0,
      })),
    [providerMetrics, totalCost],
  )

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const diff = a[sortKey] - b[sortKey]
        return sortAsc ? diff : -diff
      }),
    [rows, sortAsc, sortKey],
  )

  const lead = sorted[0] ?? null
  const efficient = useMemo(
    () =>
      [...rows]
        .filter((row) => row.tokens > 0)
        .sort((a, b) => a.costPerMillion - b.costPerMillion)[0] ?? null,
    [rows],
  )
  const totalRequests = useMemo(() => rows.reduce((sum, row) => sum + row.requests, 0), [rows])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const getAriaSort = (field: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === field ? (sortAsc ? 'ascending' : 'descending') : 'none'

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      aria-sort={getAriaSort(field)}
      className={cn(
        'px-3 py-2 text-right text-xs font-medium',
        sortKey === field ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <ArrowUpDown
          aria-hidden="true"
          className={cn('h-3 w-3', sortKey === field && 'text-primary')}
        />
      </button>
    </th>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <InfoHeading info={FEATURE_HELP.providerEfficiency}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('tables.providerEfficiency.title')}
            </CardTitle>
          </InfoHeading>
          <span className="text-xs text-muted-foreground">
            {t('tables.providerEfficiency.count', { count: rows.length })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('tables.providerEfficiency.leadProvider')}
            </div>
            <div className="mt-1 text-sm font-medium">{lead?.name ?? '–'}</div>
            <div className="text-xs text-muted-foreground">
              {lead
                ? t('tables.providerEfficiency.share', { value: formatPercent(lead.share, 0) })
                : '–'}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('tables.providerEfficiency.mostEfficient')}
            </div>
            <div className="mt-1 text-sm font-medium">{efficient?.name ?? '–'}</div>
            <div className="text-xs text-muted-foreground">
              {efficient ? `${efficient.costPerMillion.toFixed(2)} $/1M` : '–'}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('tables.providerEfficiency.totalRequests')}
            </div>
            <div className="mt-1 text-sm font-medium">{formatNumber(totalRequests)}</div>
            <div className="text-xs text-muted-foreground">
              {rows.length > 0
                ? t('tables.providerEfficiency.perProvider', {
                    value: (totalRequests / rows.length).toFixed(0),
                  })
                : '–'}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t('tables.providerEfficiency.avgPerUnit', { unit: periodUnit(viewMode) })}
            </div>
            <div className="mt-1 text-sm font-medium">
              {lead ? (
                <FormattedValue value={lead.cost / Math.max(lead.days, 1)} type="currency" />
              ) : (
                '–'
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {lead ? `${lead.days} ${periodLabel(viewMode, true)}` : '–'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-2 md:hidden">
          {sorted.map((row) => (
            <div key={row.name} className="rounded-xl border border-border/50 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-1 text-xs leading-none font-medium',
                      getProviderBadgeClasses(row.name),
                    )}
                  >
                    {row.name}
                  </span>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t('tables.providerEfficiency.share', { value: formatPercent(row.share, 1) })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    <FormattedValue value={row.cost} type="currency" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(row.requests)} {t('tables.providerEfficiency.req')}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.providerEfficiency.tokens')}
                  </div>
                  <div className="mt-1 font-mono">{formatTokens(row.tokens)}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.providerEfficiency.costPerReq')}
                  </div>
                  <div className="mt-1 font-mono">
                    <FormattedValue value={row.costPerRequest} type="currency" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.providerEfficiency.costPerMillion')}
                  </div>
                  <div className="mt-1 font-mono">
                    <FormattedValue value={row.costPerMillion} type="currency" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.providerEfficiency.cacheShare')}
                  </div>
                  <div className="mt-1 font-mono">{formatPercent(row.cacheShare, 1)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  {t('tables.providerEfficiency.provider')}
                </th>
                <SortHeader label={t('tables.providerEfficiency.cost')} field="cost" />
                <SortHeader label={t('tables.providerEfficiency.shareShort')} field="share" />
                <SortHeader label={t('tables.providerEfficiency.req')} field="requests" />
                <SortHeader label={t('tables.providerEfficiency.tokens')} field="tokens" />
                <SortHeader
                  label={t('tables.providerEfficiency.costPerReq')}
                  field="costPerRequest"
                />
                <SortHeader
                  label={t('tables.providerEfficiency.costPerMillion')}
                  field="costPerMillion"
                />
                <SortHeader label={t('tables.providerEfficiency.cacheShare')} field="cacheShare" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-border/50 transition-colors even:bg-muted/5 hover:bg-muted/10"
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-1 text-xs leading-none font-medium',
                        getProviderBadgeClasses(row.name),
                      )}
                    >
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={row.cost} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(row.share, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatNumber(row.requests)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatTokens(row.tokens)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={row.costPerRequest} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={row.costPerMillion} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(row.cacheShare, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
