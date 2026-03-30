import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import { MODEL_PRICES } from '@/lib/constants'
import { Zap } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface CacheROIProps {
  data: DailyUsage[]
}

export function CacheROI({ data }: CacheROIProps) {
  const { actualCost, hypotheticalCost, savings, savingsPercent } = useMemo(() => {
    let actual = 0
    let hypothetical = 0

    for (const d of data) {
      actual += d.totalCost

      for (const mb of d.modelBreakdowns) {
        const name = normalizeModelName(mb.modelName)
        const prices = MODEL_PRICES[name]
        if (!prices) {
          // If no pricing info, assume cache read saves ~90% vs input
          hypothetical += mb.cost + (mb.cacheReadTokens / 1_000_000) * 10
          continue
        }
        // What it would have cost if cache reads were regular input tokens
        const cacheReadAsInput = (mb.cacheReadTokens / 1_000_000) * prices.input
        const actualCacheReadCost = (mb.cacheReadTokens / 1_000_000) * prices.cacheRead
        hypothetical += mb.cost - actualCacheReadCost + cacheReadAsInput
      }
    }

    const saved = hypothetical - actual
    const pct = hypothetical > 0 ? (saved / hypothetical) * 100 : 0

    return { actualCost: actual, hypotheticalCost: hypothetical, savings: saved, savingsPercent: pct }
  }, [data])

  if (data.length === 0) return null

  const barWidth = hypotheticalCost > 0 ? (actualCost / hypotheticalCost) * 100 : 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Cache-Ersparnis (ROI)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Ohne Cache</div>
            <div className="text-lg font-bold text-red-400">{formatCurrency(hypotheticalCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Mit Cache (tatsächlich)</div>
            <div className="text-lg font-bold text-green-400">{formatCurrency(actualCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ersparnis</div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(savings)}
              <span className="text-xs ml-1 text-green-400">({formatPercent(savingsPercent)})</span>
            </div>
          </div>
        </div>

        {/* Visual bar comparison */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24">Ohne Cache</span>
            <div className="flex-1 h-6 bg-red-400/20 rounded-md overflow-hidden">
              <div className="h-full bg-red-400/60 rounded-md" style={{ width: '100%' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-24">Mit Cache</span>
            <div className="flex-1 h-6 bg-green-400/20 rounded-md overflow-hidden">
              <div className="h-full bg-green-400/60 rounded-md transition-all duration-1000" style={{ width: `${barWidth}%` }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
