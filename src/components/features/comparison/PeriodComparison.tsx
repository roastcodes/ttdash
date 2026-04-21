import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InfoHeading } from '@/components/ui/info-heading'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatTokens, formatPercent } from '@/lib/formatters'
import { computeMetrics } from '@/lib/calculations'
import { ArrowRight } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface PeriodComparisonProps {
  data: DailyUsage[]
}

type Preset = 'week' | 'month' | 'custom'

function getDelta(
  a: number,
  b: number,
  higherIsGood = false,
): { value: number; color: string; arrow: string; hasData: boolean } {
  if (b === 0 && a === 0)
    return { value: 0, color: 'text-muted-foreground', arrow: '', hasData: false }
  if (b === 0) return { value: 0, color: 'text-muted-foreground', arrow: '↑', hasData: false }
  const pct = ((a - b) / b) * 100
  const isPositive = pct > 0
  // For costs: higher is bad (red). For cache-rate: higher is good (green).
  const color =
    pct === 0
      ? 'text-muted-foreground'
      : isPositive === higherIsGood
        ? 'text-green-400'
        : 'text-red-400'
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : ''
  return { value: Math.abs(pct), color, arrow, hasData: true }
}

/** Renders KPI deltas between the current and previous period. */
export function PeriodComparison({ data }: PeriodComparisonProps) {
  const { t } = useTranslation()
  const [preset, setPreset] = useState<Preset>('week')

  const { periodA, periodB, labelA, labelB } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    if (sorted.length === 0) return { periodA: [], periodB: [], labelA: '', labelB: '' }

    // Use the date string directly to avoid timezone issues with toISOString()
    const lastEntry = sorted[sorted.length - 1]
    if (!lastEntry) return { periodA: [], periodB: [], labelA: '', labelB: '' }
    const lastStr = lastEntry.date
    const lastDate = new Date(lastStr + 'T00:00:00')

    // Helper: format local date as YYYY-MM-DD without timezone shift
    const fmtLocal = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    if (preset === 'week') {
      // Week starts on Monday (Swiss/European standard)
      const dayOfWeek = lastDate.getDay() // 0=Sun, 1=Mon, ...
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      const thisMonday = new Date(lastDate)
      thisMonday.setDate(thisMonday.getDate() - daysSinceMonday)

      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(lastMonday.getDate() - 7)

      const lastSunday = new Date(thisMonday)
      lastSunday.setDate(lastSunday.getDate() - 1)

      const weekAgoStr = fmtLocal(thisMonday)
      const twoWeeksAgoStr = fmtLocal(lastMonday)

      return {
        periodA: sorted.filter((d) => d.date >= weekAgoStr && d.date <= lastStr),
        periodB: sorted.filter((d) => d.date >= twoWeeksAgoStr && d.date < weekAgoStr),
        labelA: t('comparison.thisWeek'),
        labelB: t('comparison.lastWeek'),
      }
    }

    // month - use string-based month extraction (no timezone issue)
    const currentMonth = lastStr.slice(0, 7)
    const prevDate = new Date(lastDate)
    prevDate.setDate(1) // avoid overflow when prev month has fewer days (e.g. Mar 31 → Feb 31 → Mar 3)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonth = fmtLocal(prevDate).slice(0, 7)

    return {
      periodA: sorted.filter((d) => d.date.startsWith(currentMonth)),
      periodB: sorted.filter((d) => d.date.startsWith(prevMonth)),
      labelA: t('comparison.thisMonth'),
      labelB: t('comparison.lastMonth'),
    }
  }, [data, preset, t])

  const metricsA = useMemo(() => computeMetrics(periodA), [periodA])
  const metricsB = useMemo(() => computeMetrics(periodB), [periodB])

  if (data.length < 7) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <InfoHeading info={CHART_HELP.periodComparison}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('comparison.title')}
            </CardTitle>
          </InfoHeading>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('comparison.notEnoughData')}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {t('comparison.requiresDays', { count: data.length })}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasPrevData = periodB.length > 0
  const fmtB = (val: string) => (hasPrevData ? val : '–')

  const comparisons = [
    {
      label: t('comparison.cost'),
      a: formatCurrency(metricsA.totalCost),
      b: fmtB(formatCurrency(metricsB.totalCost)),
      delta: getDelta(metricsA.totalCost, metricsB.totalCost),
    },
    {
      label: t('comparison.tokens'),
      a: formatTokens(metricsA.totalTokens),
      b: fmtB(formatTokens(metricsB.totalTokens)),
      delta: getDelta(metricsA.totalTokens, metricsB.totalTokens),
    },
    {
      label: '$/1M',
      a: `$${metricsA.costPerMillion.toFixed(2)}`,
      b: fmtB(`$${metricsB.costPerMillion.toFixed(2)}`),
      delta: getDelta(metricsA.costPerMillion, metricsB.costPerMillion),
    },
    {
      label: t('comparison.avgPerDay'),
      a: formatCurrency(metricsA.avgDailyCost),
      b: fmtB(formatCurrency(metricsB.avgDailyCost)),
      delta: getDelta(metricsA.avgDailyCost, metricsB.avgDailyCost),
    },
    {
      label: t('comparison.cacheRate'),
      a: formatPercent(metricsA.cacheHitRate),
      b: fmtB(formatPercent(metricsB.cacheHitRate)),
      delta: getDelta(metricsA.cacheHitRate, metricsB.cacheHitRate, true),
    },
    {
      label: t('comparison.days'),
      a: String(metricsA.activeDays),
      b: fmtB(String(metricsB.activeDays)),
      delta: getDelta(metricsA.activeDays, metricsB.activeDays),
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <InfoHeading info={CHART_HELP.periodComparison}>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('comparison.title')}
            </CardTitle>
          </InfoHeading>
          <div className="flex gap-1">
            <Button
              variant={preset === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('week')}
              className="h-7 text-xs"
            >
              {t('comparison.week')}
            </Button>
            <Button
              variant={preset === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('month')}
              className="h-7 text-xs"
            >
              {t('comparison.month')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                  {t('comparison.metric')}
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-primary">{labelB}</th>
                <th className="w-8 px-2 py-2 text-center text-xs text-muted-foreground"></th>
                <th className="px-2 py-2 text-right text-xs font-medium text-primary">{labelA}</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
                  {t('comparison.delta')}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="px-2 py-2 text-muted-foreground">{row.label}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.b}</td>
                  <td className="px-2 py-2 text-center">
                    <ArrowRight className="inline h-3 w-3 text-muted-foreground" />
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-medium">{row.a}</td>
                  <td className="px-2 py-2 text-right">
                    {row.delta.hasData ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs font-medium ${row.delta.color} ${
                          row.delta.color === 'text-red-400'
                            ? 'bg-red-400/10'
                            : row.delta.color === 'text-green-400'
                              ? 'bg-green-400/10'
                              : ''
                        }`}
                      >
                        {row.delta.arrow}
                        {formatPercent(row.delta.value)}
                      </span>
                    ) : (
                      '–'
                    )}
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
