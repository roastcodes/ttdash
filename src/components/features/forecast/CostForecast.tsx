import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartCard } from '@/components/charts/ChartCard'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { CHART_COLORS, CHART_MARGIN } from '@/components/charts/chart-theme'
import { formatCurrency, formatDateAxis } from '@/lib/formatters'
import { linearRegression } from '@/lib/calculations'
import { MetricCard } from '@/components/cards/MetricCard'
import { TrendingUp } from 'lucide-react'
import type { DailyUsage } from '@/types'

interface CostForecastProps {
  data: DailyUsage[]
}

export function CostForecast({ data }: CostForecastProps) {
  const { chartData, forecastTotal, currentMonthTotal } = useMemo(() => {
    if (data.length < 7) return { chartData: [], forecastTotal: 0, currentMonthTotal: 0 }

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const lastDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
    const currentMonth = sorted[sorted.length - 1].date.slice(0, 7)

    // Get current month data
    const monthData = sorted.filter(d => d.date.startsWith(currentMonth))
    const monthTotal = monthData.reduce((s, d) => s + d.totalCost, 0)

    // Use last 14 days for regression
    const recentData = sorted.slice(-14)
    const costs = recentData.map(d => d.totalCost)
    const { slope, intercept } = linearRegression(costs)

    // Calculate std dev for confidence band
    const predictions = costs.map((_, i) => slope * i + intercept)
    const residuals = costs.map((c, i) => c - predictions[i])
    const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / costs.length)

    // Build chart data: actual + forecast
    const points: { date: string; cost?: number; forecast?: number; upper?: number; lower?: number }[] = []

    // Actual data points
    for (const d of monthData) {
      points.push({ date: d.date, cost: d.totalCost })
    }

    // Forecast to end of month
    const daysInMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0).getDate()
    const lastDayNum = lastDate.getDate()
    const baseIndex = recentData.length - 1

    let runningForecast = monthTotal
    for (let day = lastDayNum + 1; day <= daysInMonth; day++) {
      const forecastDate = `${currentMonth}-${String(day).padStart(2, '0')}`
      const idx = baseIndex + (day - lastDayNum)
      const predicted = Math.max(0, slope * idx + intercept)
      runningForecast += predicted
      points.push({
        date: forecastDate,
        forecast: predicted,
        upper: Math.max(0, predicted + stdDev),
        lower: Math.max(0, predicted - stdDev),
      })
    }

    return { chartData: points, forecastTotal: runningForecast, currentMonthTotal: monthTotal }
  }, [data])

  if (chartData.length === 0) return null

  return (
    <div className="space-y-4">
      <MetricCard
        label="Prognose Monatsende"
        value={`~${formatCurrency(forecastTotal)}`}
        subtitle={`Bisher: ${formatCurrency(currentMonthTotal)}`}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <ChartCard title="Kostenprognose aktueller Monat">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(262, 60%, 55%)" fillOpacity={0.1} name="Konfidenzband" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(224, 20%, 6%)" fillOpacity={1} legendType="none" />
            <Line type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} name="Ist-Kosten" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.ma7} name="Prognose" dot={false} strokeWidth={2} strokeDasharray="6 3" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
