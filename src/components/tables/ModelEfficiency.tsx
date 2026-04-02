import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatPercent } from '@/lib/formatters'
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
  modelCosts: Map<string, { cost: number; tokens: number; days: number }>
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
        <CardTitle className="text-sm font-medium text-muted-foreground">Modell-Effizienz</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
