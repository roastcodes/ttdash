import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatTokens, formatPercent } from '@/lib/formatters'
import { getModelColor } from '@/lib/model-utils'
import { ArrowUpDown } from 'lucide-react'

interface ModelData {
  name: string
  cost: number
  tokens: number
  costPerMillion: number
  share: number
  days: number
}

interface ModelEfficiencyProps {
  modelCosts: Map<string, { cost: number; tokens: number; days: Set<string> }>
  totalCost: number
}

type SortKey = 'cost' | 'tokens' | 'costPerMillion' | 'share' | 'days'

export function ModelEfficiency({ modelCosts, totalCost }: ModelEfficiencyProps) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortAsc, setSortAsc] = useState(false)

  const models: ModelData[] = Array.from(modelCosts.entries()).map(([name, v]) => ({
    name,
    cost: v.cost,
    tokens: v.tokens,
    costPerMillion: v.tokens > 0 ? v.cost / (v.tokens / 1_000_000) : 0,
    share: totalCost > 0 ? (v.cost / totalCost) * 100 : 0,
    days: v.days.size,
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
      className="px-3 py-2 text-right text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
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
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Modell</th>
                <SortHeader label="Kosten" field="cost" />
                <SortHeader label="Tokens" field="tokens" />
                <SortHeader label="$/1M" field="costPerMillion" />
                <SortHeader label="Anteil" field="share" />
                <SortHeader label="Tage" field="days" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(model => (
                <tr key={model.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getModelColor(model.name) }} />
                      <span className="font-medium">{model.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(model.cost)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatTokens(model.tokens)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">${model.costPerMillion.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatPercent(model.share)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{model.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
