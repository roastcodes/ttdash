import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useInView } from 'framer-motion'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoButton } from '@/components/features/help/InfoButton'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { CHART_HELP } from '@/lib/help-content'
import { formatCurrency, formatDate, formatNumber, formatPercent, formatTokens } from '@/lib/formatters'
import type { DailyUsage } from '@/types'

interface CorrelationAnalysisProps {
  data: DailyUsage[]
}

interface ScatterPoint {
  x: number
  y: number
  z: number
  label: string
  tokens?: number
  requests?: number
  cacheRate?: number
}

function correlation(valuesA: number[], valuesB: number[]) {
  if (valuesA.length !== valuesB.length || valuesA.length < 2) return 0
  const avgA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length
  const avgB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length
  const covariance = valuesA.reduce((sum, value, index) => sum + (value - avgA) * (valuesB[index] - avgB), 0)
  const varianceA = valuesA.reduce((sum, value) => sum + (value - avgA) ** 2, 0)
  const varianceB = valuesB.reduce((sum, value) => sum + (value - avgB) ** 2, 0)
  if (varianceA === 0 || varianceB === 0) return 0
  return covariance / Math.sqrt(varianceA * varianceB)
}

function ScatterTooltip({ active, payload, mode }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }>; mode: 'requestCost' | 'cacheEfficiency' }) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null

  const point = payload[0].payload

  return (
    <div className="max-w-[260px] bg-popover/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{formatDate(point.label)}</p>
      <div className="space-y-1">
        {mode === 'requestCost' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.requestsLabel')}</span>
              <span className="font-mono font-medium">{point.requests !== undefined ? formatNumber(point.requests) : '–'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.cost')}</span>
              <span className="font-mono font-medium">{formatCurrency(point.y)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.tokensLabel')}</span>
              <span className="font-mono font-medium">{point.tokens ? formatTokens(point.tokens) : '–'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.cacheRate')}</span>
              <span className="font-mono font-medium">{point.cacheRate !== undefined ? formatPercent(point.cacheRate, 1) : '–'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.costPerRequest')}</span>
              <span className="font-mono font-medium">{formatCurrency(point.y)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t('charts.correlation.requestsLabel')}</span>
              <span className="font-mono font-medium">{point.requests !== undefined ? formatNumber(point.requests) : '–'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CorrelationPanel({
  title,
  subtitle,
  mode,
  data,
  color,
  animationBegin = 0,
  xAxisName,
  xTickFormatter,
  yAxisName,
  footer,
  delay,
}: {
  title: string
  subtitle: string
  mode: 'requestCost' | 'cacheEfficiency'
  data: ScatterPoint[]
  color: string
  animationBegin?: number
  xAxisName: string
  xTickFormatter?: (value: number) => string
  yAxisName: string
  footer: string
  delay: number
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const panelInView = useInView(panelRef, { once: true, amount: 0.45 })
  const [animatePoints, setAnimatePoints] = useState(false)
  const chartData = animatePoints ? data : []

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 20 }}
      animate={panelInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      onAnimationComplete={() => {
        if (panelInView) setAnimatePoints(true)
      }}
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
          <div className="text-[10px] text-muted-foreground">{subtitle}</div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.25} />
            <XAxis type="number" dataKey="x" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} name={xAxisName} {...(xTickFormatter ? { tickFormatter: xTickFormatter } : {})} />
            <YAxis type="number" dataKey="y" stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} name={yAxisName} tickFormatter={formatCurrency} />
            <ZAxis type="number" dataKey="z" range={[30, 180]} />
            <Tooltip content={<ScatterTooltip mode={mode} />} cursor={{ strokeDasharray: '4 4' }} />
            <Scatter
              data={chartData}
              fill={color}
              stroke={color}
              fillOpacity={0.72}
              isAnimationActive={animatePoints}
              animationBegin={animationBegin}
              animationDuration={CHART_ANIMATION.duration}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground">{footer}</div>
      </div>
    </motion.div>
  )
}

export function CorrelationAnalysis({ data }: CorrelationAnalysisProps) {
  const { t } = useTranslation()
  const requestVsCost = useMemo<ScatterPoint[]>(() => data.map(entry => ({
    x: entry.requestCount,
    y: entry.totalCost,
    z: Math.max(5, Math.sqrt(entry.totalTokens / 1000)),
    label: entry.date,
    tokens: entry.totalTokens,
    requests: entry.requestCount,
  })), [data])

  const cacheVsCostPerRequest = useMemo<ScatterPoint[]>(() => data
    .filter(entry => entry.requestCount > 0 && entry.totalTokens > 0)
    .map(entry => {
      const cacheShare = (entry.cacheReadTokens / entry.totalTokens) * 100
      return {
        x: cacheShare,
        y: entry.totalCost / entry.requestCount,
        z: Math.max(5, Math.sqrt(entry.requestCount)),
        label: entry.date,
        cacheRate: cacheShare,
        requests: entry.requestCount,
      }
    }), [data])

  const requestCostCorrelation = correlation(requestVsCost.map(point => point.x), requestVsCost.map(point => point.y))
  const cacheEfficiencyCorrelation = correlation(cacheVsCostPerRequest.map(point => point.x), cacheVsCostPerRequest.map(point => point.y))

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {t('charts.correlation.title')}
            <InfoButton text={CHART_HELP.correlationAnalysis} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            {t('charts.correlation.requiresData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {t('charts.correlation.title')}
          <InfoButton text={CHART_HELP.correlationAnalysis} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CorrelationPanel
          title={t('charts.correlation.requestsVsCost')}
          subtitle={`r ${requestCostCorrelation.toFixed(2)} · ${t('charts.correlation.points', { count: requestVsCost.length })}`}
          mode="requestCost"
          data={requestVsCost}
          color={CHART_COLORS.cost}
          xAxisName={t('charts.correlation.requestsAxis')}
          yAxisName={t('charts.correlation.cost')}
          footer={requestCostCorrelation >= 0.6 ? t('charts.correlation.strongRequestCost') : requestCostCorrelation >= 0.3 ? t('charts.correlation.mediumRequestCost') : t('charts.correlation.weakRequestCost')}
          delay={0.02}
        />

        <CorrelationPanel
          title={t('charts.correlation.cacheVsCostPerRequest')}
          subtitle={`r ${cacheEfficiencyCorrelation.toFixed(2)} · ${t('charts.correlation.points', { count: cacheVsCostPerRequest.length })}`}
          mode="cacheEfficiency"
          data={cacheVsCostPerRequest}
          color={CHART_COLORS.cumulative}
          animationBegin={CHART_ANIMATION.stagger}
          xAxisName={t('charts.correlation.cacheRate')}
          xTickFormatter={(value) => formatPercent(value, 0)}
          yAxisName={t('charts.correlation.costPerRequestAxis')}
          footer={cacheEfficiencyCorrelation <= -0.3 ? t('charts.correlation.negativeCache') : cacheEfficiencyCorrelation < 0.2 ? t('charts.correlation.neutralCache') : t('charts.correlation.positiveCache')}
          delay={0.08}
        />
      </CardContent>
    </Card>
  )
}
