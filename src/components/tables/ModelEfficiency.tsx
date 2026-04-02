import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatPercent, formatTokens } from '@/lib/formatters'
import { getModelColor, getModelProvider, getProviderBadgeClasses } from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import { ArrowUpDown } from 'lucide-react'

interface ModelData {
  name: string
  cost: number
  tokens: number
  costPerMillion: number
  share: number
  days: number
  requests: number
  costPerDay: number
}

import { periodUnit, periodLabel } from '@/lib/formatters'
import type { ViewMode } from '@/types'

interface ModelEfficiencyProps {
  modelCosts: Map<string, { cost: number; tokens: number; days: number; requests: number; costPerDay?: number }>
  totalCost: number
  viewMode?: ViewMode
}

type SortKey = 'cost' | 'tokens' | 'costPerMillion' | 'share' | 'days' | 'requests' | 'costPerDay'

export function ModelEfficiency({ modelCosts, totalCost, viewMode = 'daily' }: ModelEfficiencyProps) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortAsc, setSortAsc] = useState(false)

  const models: ModelData[] = Array.from(modelCosts.entries()).map(([name, v]) => ({
    name,
    cost: v.cost,
    tokens: v.tokens,
    costPerMillion: v.tokens > 0 ? v.cost / (v.tokens / 1_000_000) : 0,
    share: totalCost > 0 ? (v.cost / totalCost) * 100 : 0,
    days: v.days,
    requests: v.requests,
    costPerDay: v.days > 0 ? v.cost / v.days : 0,
  }))

  const sorted = [...models].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })

  const topModel = sorted[0] ?? null
  const mostEfficient = [...models]
    .filter(model => model.tokens > 0)
    .sort((a, b) => a.costPerMillion - b.costPerMillion)[0] ?? null
  const totalRequests = models.reduce((sum, model) => sum + model.requests, 0)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className={cn(
        "px-3 py-2 text-right text-xs font-medium cursor-pointer hover:text-foreground transition-colors",
        sortKey === field ? "text-foreground" : "text-muted-foreground"
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === field && "text-primary")} />
      </span>
    </th>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modell-Effizienz</CardTitle>
            <span className="text-xs text-muted-foreground">{models.length} Modelle</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top Modell</div>
              <div className="mt-1 text-sm font-medium">{topModel?.name ?? '–'}</div>
              <div className="text-xs text-muted-foreground">{topModel ? `${formatPercent(topModel.share, 0)} Anteil` : '–'}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Effizientestes Modell</div>
              <div className="mt-1 text-sm font-medium">{mostEfficient?.name ?? '–'}</div>
              <div className="text-xs text-muted-foreground">{mostEfficient ? `${formatPercent(mostEfficient.share, 0)} Anteil` : '–'}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total Requests</div>
              <div className="mt-1 text-sm font-medium">{totalRequests.toLocaleString('de-CH')}</div>
              <div className="text-xs text-muted-foreground">{models.length > 0 ? `${(totalRequests / models.length).toFixed(0)} / Modell` : '–'}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top Modell Tokens</div>
              <div className="mt-1 text-sm font-medium">{topModel ? formatTokens(topModel.tokens) : '–'}</div>
              <div className="text-xs text-muted-foreground">{topModel ? `${topModel.days} ${periodLabel(viewMode, true)}` : '–'}</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:hidden">
          {sorted.map(model => (
            <div key={model.name} className="rounded-xl border border-border/50 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getModelColor(model.name) }} />
                    <span className="font-medium truncate">{model.name}</span>
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                    {getModelProvider(model.name)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold"><FormattedValue value={model.cost} type="currency" /></div>
                  <div className="text-xs text-muted-foreground">{formatPercent(model.share, 1)} Anteil</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">Tokens</div>
                  <div className="mt-1 font-mono">{formatTokens(model.tokens)}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">$/1M</div>
                  <div className="mt-1 font-mono"><FormattedValue value={model.costPerMillion} type="currency" /></div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">Requests</div>
                  <div className="mt-1 font-mono">{model.requests.toLocaleString('de-CH')}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">Ø/{periodUnit(viewMode)}</div>
                  <div className="mt-1 font-mono"><FormattedValue value={model.costPerDay} type="currency" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Modell</th>
                <SortHeader label="Kosten" field="cost" />
                <SortHeader label="Tokens" field="tokens" />
                <SortHeader label="$/1M" field="costPerMillion" />
                <SortHeader label="Anteil" field="share" />
                <SortHeader label="Req" field="requests" />
                <SortHeader label={`Ø/${periodUnit(viewMode)}`} field="costPerDay" />
                <SortHeader label={periodLabel(viewMode, true)} field="days" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(model => (
                <tr key={model.name} className="border-b border-border/50 even:bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getModelColor(model.name) }} />
                      <span className="font-medium">{model.name}</span>
                      <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none', getProviderBadgeClasses(getModelProvider(model.name)))}>
                        {getModelProvider(model.name)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.cost} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.tokens} type="tokens" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.costPerMillion} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums relative">
                    <div className="absolute inset-y-1 left-0 rounded-sm transition-all duration-500" style={{ width: `${model.share}%`, backgroundColor: `${getModelColor(model.name)}20` }} />
                    <span className="relative">{formatPercent(model.share)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{model.requests}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.costPerDay} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{model.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
