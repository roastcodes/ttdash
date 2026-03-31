import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPercent } from '@/lib/formatters'
import { normalizeModelName } from '@/lib/model-utils'
import { MODEL_PRICES } from '@/lib/constants'
import { Zap } from 'lucide-react'
import { FormattedValue } from '@/components/ui/formatted-value'
import { InfoButton } from '@/components/features/help/InfoButton'
import type { DailyUsage } from '@/types'

interface CacheROIProps {
  data: DailyUsage[]
}

export function CacheROI({ data }: CacheROIProps) {
  const { actualCost, hypotheticalCost, savings, savingsPercent, dailyAvg } = useMemo(() => {
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
    const dailyAvg = data.length > 0 ? actual / data.length : 0

    return { actualCost: actual, hypotheticalCost: hypothetical, savings: saved, savingsPercent: pct, dailyAvg }
  }, [data])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground/30" />
            Cache-Ersparnis (ROI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Keine Daten verfügbar</p>
        </CardContent>
      </Card>
    )
  }

  const barWidth = hypotheticalCost > 0 ? (actualCost / hypotheticalCost) * 100 : 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Cache-Ersparnis (ROI)
          <InfoButton text="Vergleicht hypothetische Kosten ohne Cache mit den tatsächlichen Kosten. Cache-Read-Tokens werden zu regulären Input-Token-Preisen berechnet." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Ohne Cache</div>
            <div className="text-lg font-bold text-red-400"><FormattedValue value={hypotheticalCost} type="currency" /></div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Mit Cache (tatsächlich)</div>
            <div className="text-lg font-bold text-green-400"><FormattedValue value={actualCost} type="currency" /></div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ersparnis</div>
            <div className="text-lg font-bold text-primary">
              <FormattedValue value={savings} type="currency" />
              <span className="text-xs ml-1 text-green-400">({formatPercent(savingsPercent)})</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ø Tageskosten</div>
            <div className="text-lg font-bold text-foreground">
              <FormattedValue value={dailyAvg} type="currency" />
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
            <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden flex">
              <div className="h-full bg-green-400/60 rounded-l-md transition-all duration-1000" style={{ width: `${barWidth}%` }} />
              <div className="h-full bg-green-400/20 flex-1 rounded-r-md border-l border-green-400/30 border-dashed" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400/60" /> Bezahlt</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400/20 border border-green-400/30 border-dashed" /> Gespart</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
