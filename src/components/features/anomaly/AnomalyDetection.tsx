import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { computeAnomalies } from '@/lib/calculations'
import { CHART_HELP } from '@/lib/help-content'
import { TriangleAlert } from 'lucide-react'
import { periodLabel } from '@/lib/formatters'
import type { DailyUsage, ViewMode } from '@/types'

interface AnomalyDetectionProps {
  data: DailyUsage[]
  onClickDay?: (date: string) => void
  viewMode?: ViewMode
}

export function AnomalyDetection({ data, onClickDay, viewMode = 'daily' }: AnomalyDetectionProps) {
  const { t } = useTranslation()
  const { anomalies, mean, stdDev } = useMemo(() => {
    if (data.length < 3) return { anomalies: [], mean: 0, stdDev: 0 }
    const costs = data.map((d) => d.totalCost)
    const m = costs.reduce((s, v) => s + v, 0) / costs.length
    const sd = Math.sqrt(costs.reduce((s, v) => s + (v - m) ** 2, 0) / costs.length)
    return { anomalies: computeAnomalies(data), mean: m, stdDev: sd }
  }, [data])

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <InfoHeading info={CHART_HELP.anomalyDetection}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('anomaly.title', { period: periodLabel(viewMode, true) })}
            </CardTitle>
          </InfoHeading>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('anomaly.none')}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t('anomaly.withinStdDev')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <InfoHeading info={CHART_HELP.anomalyDetection}>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-yellow-500" />
            {t('anomaly.title', { period: periodLabel(viewMode, true) })} ({anomalies.length})
          </CardTitle>
        </InfoHeading>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {t('anomaly.description', {
            period: periodLabel(viewMode, true),
            mean: formatCurrency(mean),
            stdDev: formatCurrency(stdDev),
          })}
        </p>
        <div className="space-y-2">
          {[...anomalies]
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((day) => {
              const zScoreNum = stdDev > 0 ? (day.totalCost - mean) / stdDev : 0
              const zScore = zScoreNum.toFixed(1)
              const isHigh = day.totalCost > mean
              const severity = Math.abs(zScoreNum) >= 3 ? 'critical' : 'warn'
              return (
                <div
                  key={day.date}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    severity === 'critical'
                      ? 'bg-red-400/10 hover:bg-red-400/20 border border-red-400/20'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => onClickDay?.(day.date)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${isHigh ? 'bg-red-400' : 'bg-green-400'} ${severity === 'critical' ? 'animate-pulse' : ''}`}
                    />
                    <span className="text-sm">{formatDate(day.date, 'long')}</span>
                    {severity === 'critical' && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                        {t('anomaly.critical')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-sm font-mono font-medium ${isHigh ? 'text-red-400' : 'text-green-400'}`}
                    >
                      {formatCurrency(day.totalCost)}
                    </span>
                    <span
                      className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
                        severity === 'critical'
                          ? 'text-red-300 bg-red-400/15'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isHigh ? '+' : ''}
                      {zScore}σ
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
