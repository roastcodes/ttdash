import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useState, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartCard, ChartAnimationAware, ChartReveal } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, getBarAnimationProps } from './chart-theme'
import { coerceNumber, formatCurrency } from '@/lib/formatters'
import { CHART_HELP } from '@/lib/help-content'
import type { WeekdayData } from '@/types'

interface CostByWeekdayProps {
  data: WeekdayData[]
}

const WEEKEND_DAY_FALLBACKS = new Set([
  // Saturday
  'sa',
  'sam',
  'samedi',
  'sab',
  'sabado',
  'sabato',
  'sat',
  'saturday',
  // Sunday
  'dim',
  'dimanche',
  'dom',
  'domingo',
  'domenica',
  'so',
  'sonntag',
  'su',
  'sun',
  'sunday',
])

function isWeekendEntry(entry: WeekdayData) {
  if (entry.weekdayIndex !== undefined) {
    return entry.weekdayIndex === 5 || entry.weekdayIndex === 6
  }

  // buildDashboardChartTransforms provides weekdayIndex; day labels are a legacy/external fallback.
  const normalizedDay = entry.day
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.$/, '')
  return WEEKEND_DAY_FALLBACKS.has(normalizedDay)
}

/** Renders average cost by weekday. */
export function CostByWeekday({ data }: CostByWeekdayProps) {
  const { t } = useTranslation()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const uid = useId()
  const gid = (n: string) => `${uid}-${n}`.replace(/:/g, '')
  const chartData = [...data].sort((left, right) => {
    if (left.weekdayIndex === undefined && right.weekdayIndex === undefined) {
      return 0
    }
    if (left.weekdayIndex === undefined) {
      return 1
    }
    if (right.weekdayIndex === undefined) {
      return -1
    }
    return left.weekdayIndex - right.weekdayIndex
  })

  const maxCost = Math.max(...chartData.map((d) => d.cost))
  const minCost = Math.min(...chartData.map((d) => d.cost))
  const peakIndex = chartData.findIndex((d) => d.cost === maxCost)
  const lowIndex = chartData.findIndex((d) => d.cost === minCost)
  const weekendCost = chartData
    .filter((entry) => isWeekendEntry(entry))
    .reduce((sum, entry) => sum + entry.cost, 0)
  const weekTotal = chartData.reduce((sum, entry) => sum + entry.cost, 0)

  return (
    <ChartCard
      title={t('charts.costByWeekday.title')}
      subtitle={t('charts.costByWeekday.subtitle', {
        peak: chartData[peakIndex]?.day ?? '–',
        low: chartData[lowIndex]?.day ?? '–',
        share: `${(weekTotal > 0 ? (weekendCost / weekTotal) * 100 : 0).toFixed(0)}%`,
      })}
      info={CHART_HELP.costByWeekday}
      chartData={chartData as unknown as Record<string, unknown>[]}
      valueKey="cost"
      valueFormatter={formatCurrency}
    >
      <ChartAnimationAware>
        {(animate) => (
          <ChartReveal variant="bar">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={CHART_MARGIN}
                onMouseMove={(state) => {
                  if (
                    state?.activeTooltipIndex !== undefined &&
                    typeof state.activeTooltipIndex === 'number'
                  ) {
                    setActiveIndex(state.activeTooltipIndex)
                  }
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <defs>
                  <linearGradient id={gid('weekday')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id={gid('weekdayActive')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id={gid('weekdayPeak')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(35, 80%, 52%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(35, 80%, 52%)" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id={gid('weekdayLow')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 50%, 52%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(160, 50%, 52%)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
                <XAxis dataKey="day" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => {
                    const numericValue = coerceNumber(value)
                    return numericValue === null ? '' : formatCurrency(numericValue)
                  }}
                  stroke={CHART_COLORS.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                />
                <Bar
                  dataKey="cost"
                  radius={[4, 4, 0, 0]}
                  name={t('charts.costByWeekday.averageCost')}
                  {...getBarAnimationProps(animate)}
                >
                  {chartData.map((_, index) => {
                    let fill = `url(#${gid('weekday')})`
                    if (activeIndex === index) fill = `url(#${gid('weekdayActive')})`
                    else if (index === peakIndex) fill = `url(#${gid('weekdayPeak')})`
                    else if (index === lowIndex) fill = `url(#${gid('weekdayLow')})`
                    return <Cell key={index} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartReveal>
        )}
      </ChartAnimationAware>
    </ChartCard>
  )
}
