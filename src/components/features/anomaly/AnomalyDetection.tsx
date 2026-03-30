import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { computeAnomalies } from '@/lib/calculations'
import { TriangleAlert } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface AnomalyDetectionProps {
  data: DailyUsage[]
  onClickDay?: (date: string) => void
}

export function AnomalyDetection({ data, onClickDay }: AnomalyDetectionProps) {
  const { anomalies, mean, stdDev } = useMemo(() => {
    if (data.length < 3) return { anomalies: [], mean: 0, stdDev: 0 }
    const costs = data.map(d => d.totalCost)
    const m = costs.reduce((s, v) => s + v, 0) / costs.length
    const sd = Math.sqrt(costs.reduce((s, v) => s + (v - m) ** 2, 0) / costs.length)
    return { anomalies: computeAnomalies(data), mean: m, stdDev: sd }
  }, [data])

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Auffällige Tage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Keine Anomalien erkannt</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Alle Kosten liegen innerhalb von 2 Standardabweichungen</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-yellow-500" />
          Auffällige Tage ({anomalies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Tage mit Kosten &gt;2 Standardabweichungen vom Mittelwert ({formatCurrency(mean)} ± {formatCurrency(stdDev)})
        </p>
        <div className="space-y-2">
          {anomalies
            .sort((a, b) => b.totalCost - a.totalCost)
            .map(day => {
              const zScore = ((day.totalCost - mean) / stdDev).toFixed(1)
              const isHigh = day.totalCost > mean
              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onClickDay?.(day.date)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isHigh ? 'bg-red-400' : 'bg-green-400'}`} />
                    <span className="text-sm">{formatDate(day.date, 'long')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-mono font-medium ${isHigh ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(day.totalCost)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {isHigh ? '+' : ''}{zScore}σ
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}
