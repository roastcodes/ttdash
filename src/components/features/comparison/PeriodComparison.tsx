import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTokens, formatPercent } from '@/lib/formatters'
import { computeMetrics } from '@/lib/calculations'
import { ArrowRight } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface PeriodComparisonProps {
  data: DailyUsage[]
}

type Preset = 'week' | 'month' | 'custom'

function getDelta(a: number, b: number): { value: number; color: string; arrow: string } {
  if (b === 0) return { value: 0, color: 'text-muted-foreground', arrow: '' }
  const pct = ((a - b) / b) * 100
  // For costs: lower is better (green), higher is worse (red)
  const color = pct > 0 ? 'text-red-400' : pct < 0 ? 'text-green-400' : 'text-muted-foreground'
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : ''
  return { value: Math.abs(pct), color, arrow }
}

export function PeriodComparison({ data }: PeriodComparisonProps) {
  const [preset, setPreset] = useState<Preset>('week')

  const { periodA, periodB, labelA, labelB } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length === 0) return { periodA: [], periodB: [], labelA: '', labelB: '' }

    const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00')

    if (preset === 'week') {
      const weekAgo = new Date(lastDate)
      weekAgo.setDate(weekAgo.getDate() - 6)
      const twoWeeksAgo = new Date(weekAgo)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7)

      const weekAgoStr = weekAgo.toISOString().slice(0, 10)
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10)
      const lastStr = lastDate.toISOString().slice(0, 10)

      return {
        periodA: sorted.filter(d => d.date >= weekAgoStr && d.date <= lastStr),
        periodB: sorted.filter(d => d.date >= twoWeeksAgoStr && d.date < weekAgoStr),
        labelA: 'Diese Woche',
        labelB: 'Letzte Woche',
      }
    }

    // month
    const currentMonth = sorted[sorted.length - 1].date.slice(0, 7)
    const prevDate = new Date(lastDate)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonth = prevDate.toISOString().slice(0, 7)

    return {
      periodA: sorted.filter(d => d.date.startsWith(currentMonth)),
      periodB: sorted.filter(d => d.date.startsWith(prevMonth)),
      labelA: 'Dieser Monat',
      labelB: 'Letzter Monat',
    }
  }, [data, preset])

  const metricsA = useMemo(() => computeMetrics(periodA), [periodA])
  const metricsB = useMemo(() => computeMetrics(periodB), [periodB])

  if (data.length < 7) return null

  const comparisons = [
    { label: 'Kosten', a: formatCurrency(metricsA.totalCost), b: formatCurrency(metricsB.totalCost), delta: getDelta(metricsA.totalCost, metricsB.totalCost) },
    { label: 'Tokens', a: formatTokens(metricsA.totalTokens), b: formatTokens(metricsB.totalTokens), delta: getDelta(metricsA.totalTokens, metricsB.totalTokens) },
    { label: '$/1M', a: `$${metricsA.costPerMillion.toFixed(2)}`, b: `$${metricsB.costPerMillion.toFixed(2)}`, delta: getDelta(metricsA.costPerMillion, metricsB.costPerMillion) },
    { label: 'Ø/Tag', a: formatCurrency(metricsA.avgDailyCost), b: formatCurrency(metricsB.avgDailyCost), delta: getDelta(metricsA.avgDailyCost, metricsB.avgDailyCost) },
    { label: 'Cache-Rate', a: formatPercent(metricsA.cacheHitRate), b: formatPercent(metricsB.cacheHitRate), delta: getDelta(metricsA.cacheHitRate, metricsB.cacheHitRate) },
    { label: 'Tage', a: String(metricsA.activeDays), b: String(metricsB.activeDays), delta: getDelta(metricsA.activeDays, metricsB.activeDays) },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Perioden-Vergleich</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={preset === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('week')}
              className="text-xs h-7"
            >
              Woche
            </Button>
            <Button
              variant={preset === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('month')}
              className="text-xs h-7"
            >
              Monat
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Metrik</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-primary">{labelB}</th>
                <th className="px-2 py-2 text-center text-xs text-muted-foreground w-8"></th>
                <th className="px-2 py-2 text-right text-xs font-medium text-primary">{labelA}</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">Delta</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map(row => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="px-2 py-2 text-muted-foreground">{row.label}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.b}</td>
                  <td className="px-2 py-2 text-center"><ArrowRight className="h-3 w-3 text-muted-foreground inline" /></td>
                  <td className="px-2 py-2 text-right font-mono font-medium">{row.a}</td>
                  <td className={`px-2 py-2 text-right font-mono font-medium ${row.delta.color}`}>
                    {row.delta.arrow}{formatPercent(row.delta.value)}
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
