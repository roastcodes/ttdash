import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { formatCurrency, formatTokens, formatPercent, formatDate } from '@/lib/formatters'
import { FormattedValue } from '@/components/ui/formatted-value'
import { normalizeModelName, getModelColor } from '@/lib/model-utils'
import type { DailyUsage } from '@/types'

interface DrillDownModalProps {
  day: DailyUsage | null
  open: boolean
  onClose: () => void
}

export function DrillDownModal({ day, open, onClose }: DrillDownModalProps) {
  const modelData = useMemo(() => {
    if (!day) return []
    const map = new Map<string, { cost: number; tokens: number; input: number; output: number; cacheRead: number; cacheCreate: number }>()
    for (const mb of day.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      const ex = map.get(name) ?? { cost: 0, tokens: 0, input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }
      ex.cost += mb.cost
      ex.tokens += mb.inputTokens + mb.outputTokens + mb.cacheCreationTokens + mb.cacheReadTokens
      ex.input += mb.inputTokens
      ex.output += mb.outputTokens
      ex.cacheRead += mb.cacheReadTokens
      ex.cacheCreate += mb.cacheCreationTokens
      map.set(name, ex)
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost)
  }, [day])

  if (!day) return null

  const cacheRate = (day.cacheReadTokens + day.cacheCreationTokens + day.inputTokens + day.outputTokens) > 0
    ? (day.cacheReadTokens / (day.cacheReadTokens + day.cacheCreationTokens + day.inputTokens + day.outputTokens)) * 100
    : 0

  const pieData = modelData.map(m => ({ name: m.name, value: m.cost }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formatDate(day.date, 'long')} — {formatCurrency(day.totalCost)}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Tokens</div>
            <div className="font-mono font-medium"><FormattedValue value={day.totalTokens} type="tokens" /></div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">$/1M</div>
            <div className="font-mono font-medium"><FormattedValue value={day.totalCost / (day.totalTokens / 1_000_000)} type="currency" /></div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Cache-Rate</div>
            <div className="font-mono font-medium"><FormattedValue value={cacheRate} type="percent" /></div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Modelle</div>
            <div className="font-mono font-medium">{modelData.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={getModelColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {modelData.map(model => (
              <div key={model.name} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getModelColor(model.name) }} />
                  <span>{model.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-medium"><FormattedValue value={model.cost} type="currency" /></span>
                  <span className="text-muted-foreground ml-2 text-xs"><FormattedValue value={model.tokens} type="tokens" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
