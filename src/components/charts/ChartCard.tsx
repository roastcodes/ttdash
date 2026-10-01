import {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
  type ComponentProps,
} from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ZoomDialogContent } from '@/components/ui/zoom-dialog-content'
import { EXPAND_BUTTON_CLASSNAME } from '@/components/ui/expand-button-styles'
import { Maximize2 } from 'lucide-react'
import { InfoButton } from '@/components/ui/InfoButton'
import {
  DASHBOARD_MOTION,
  useDashboardElementMotion,
  useDashboardSectionMotion,
} from '@/components/dashboard/DashboardMotion'
import { CHART_ANIMATION } from './chart-theme'
import { PlotMotionProvider } from './chart-motion'
import { cn } from '@/lib/cn'
import { buildCsvLine } from '@/lib/csv'
import { formatCurrency } from '@/lib/formatters'
import { useShouldReduceMotion } from '@/lib/motion'

export { stringifyCsvCell } from '@/lib/csv'

interface ChartCardProps {
  title: string
  subtitle?: string
  summary?: ReactNode
  info?: string
  expandable?: boolean
  onExpand?: () => void
  children: ReactNode | ((expanded: boolean) => ReactNode)
  className?: string
  chartData?: Record<string, unknown>[]
  valueKey?: string
  valueFormatter?: (v: number) => string
  expandedExtra?: ReactNode
}

/** Serializes chart rows to a downloadable CSV string. */
export function buildChartCsv(chartData: Record<string, unknown>[]): string {
  if (chartData.length === 0) return ''

  const firstRow = chartData[0]
  if (!firstRow) return ''

  const keys = Object.keys(firstRow)
  return [
    buildCsvLine(keys),
    ...chartData.map((row) => buildCsvLine(keys.map((key) => row[key]))),
  ].join('\n')
}

interface ChartAnimationState {
  active: boolean
  delayMs: number
  runKey: number
  hasRevealed?: boolean
}

const ChartAnimationContext = createContext<ChartAnimationState>({
  active: false,
  delayMs: 0,
  runKey: 0,
})

const expandedChartAnimationState: ChartAnimationState = {
  active: false,
  delayMs: 0,
  runKey: 1,
  hasRevealed: true,
}

const ChartExpandedContext = createContext<number | null>(null)

/** Scales fixed-height plots inside the expanded instance without changing the original card. */
export function ChartResponsiveContainer(props: ComponentProps<typeof ResponsiveContainer>) {
  const expanded = useContext(ChartExpandedContext)
  const height =
    typeof props.height === 'number' && expanded !== null
      ? Math.round(
          props.height >= 250
            ? Math.max(220, Math.min(expanded * 0.62, 720))
            : Math.max(180, Math.min(expanded * 0.35, 360)),
        )
      : props.height
  return <ResponsiveContainer {...props} {...(height !== undefined ? { height } : {})} />
}

/** Gives a shared zoom surface the same plot-sizing policy as an individual chart zoom. */
export function ChartExpandedSurface({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight,
  )
  useEffect(() => {
    const resize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return <ChartExpandedContext.Provider value={height}>{children}</ChartExpandedContext.Provider>
}

/** Returns whether chart-specific animation should currently run. */
export function useChartAnimationActive() {
  return useContext(ChartAnimationContext).active
}

/** Returns the current chart animation state. */
export function useChartAnimationState() {
  return useContext(ChartAnimationContext)
}

/** Returns the current chart animation delay in milliseconds. */
export function useChartAnimationDelay() {
  return useContext(ChartAnimationContext).delayMs
}

/** Returns the current chart animation run key. */
export function useChartAnimationRunKey() {
  return useContext(ChartAnimationContext).runKey
}

/** Exposes the current chart animation state to a render prop. */
export function ChartAnimationAware({
  children,
  data,
  partitionKey,
}: {
  children: (active: boolean) => ReactNode
  data?: readonly unknown[] | undefined
  partitionKey?: string | undefined
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const visibility = useDashboardElementMotion(ref, {
    kind: 'chart',
    amount: 0.12,
    observeSelector: '.recharts-responsive-container',
  })
  const state = useMemo(
    () => ({
      active: visibility.canAnimate,
      runKey: visibility.runKey,
      delayMs: visibility.delayMs,
      hasRevealed: visibility.hasRevealed,
    }),
    [visibility.canAnimate, visibility.runKey, visibility.delayMs, visibility.hasRevealed],
  )
  return (
    <div ref={ref} className="h-full min-h-0 w-full" data-chart-animate={String(state.active)}>
      <ChartAnimationContext.Provider value={state}>
        <PlotMotionProvider
          ready={visibility.hasRevealed}
          visible={visibility.canAnimate}
          enabled={!visibility.shouldReduceMotion && typeof IntersectionObserver !== 'undefined'}
          data={data}
          partitionKey={partitionKey}
        >
          {children(state.active)}
        </PlotMotionProvider>
      </ChartAnimationContext.Provider>
    </div>
  )
}

interface ChartRevealProps {
  children: ReactNode
  variant?: 'line' | 'bar' | 'radial' | 'scatter'
}

/** Wraps chart content in the shared reveal policy for its chart variant. */
export function ChartReveal({ children, variant = 'line' }: ChartRevealProps) {
  const shouldReduceMotion = useShouldReduceMotion()
  const state = useChartAnimationState()
  const revealed = state.hasRevealed ?? state.active
  const wrapperStyle = {
    width: '100%',
    height: '100%',
    overflow: 'visible',
    paddingTop: variant === 'radial' ? 8 : 0,
    paddingBottom: variant === 'radial' ? 8 : 0,
    boxSizing: 'border-box',
  } as const

  if (shouldReduceMotion || variant !== 'scatter') {
    return <div style={wrapperStyle}>{children}</div>
  }

  return (
    <motion.div
      style={wrapperStyle}
      initial={false}
      animate={revealed ? { opacity: 1 } : { opacity: 0 }}
      transition={{
        duration: state.active ? CHART_ANIMATION.revealDuration / 1000 : 0,
        delay: 0,
        ease: DASHBOARD_MOTION.sectionRevealEase,
      }}
    >
      <div className="h-full min-h-0">{children}</div>
    </motion.div>
  )
}

/** Renders a chart card with export, expand, and stats affordances. */
export function ChartCard({
  title,
  subtitle,
  summary,
  info,
  expandable = true,
  onExpand,
  children,
  className,
  chartData,
  valueKey,
  valueFormatter,
  expandedExtra,
}: ChartCardProps) {
  const { t } = useTranslation()
  const sectionMotion = useDashboardSectionMotion()
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const elementMotion = useDashboardElementMotion(cardRef, {
    kind: 'chart',
    amount: 0.3,
  })
  const animationState = useMemo<ChartAnimationState>(
    () => ({
      active: elementMotion.canAnimate,
      delayMs: elementMotion.delayMs,
      runKey: elementMotion.runKey,
      hasRevealed: elementMotion.hasRevealed,
    }),
    [
      elementMotion.canAnimate,
      elementMotion.delayMs,
      elementMotion.runKey,
      elementMotion.hasRevealed,
    ],
  )

  const stats = useMemo(() => {
    if (!expanded || !chartData || !valueKey) return null
    const values = chartData
      .map((d) => d[valueKey])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    if (values.length === 0) return null
    const sum = values.reduce((s, v) => s + v, 0)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      total: sum,
      count: values.length,
    }
  }, [chartData, expanded, valueKey])

  const fmt = valueFormatter ?? formatCurrency
  const renderChildren = (isExpanded: boolean) =>
    typeof children === 'function' ? children(isExpanded) : children
  const isSectionVisible = sectionMotion?.sectionVisible ?? true
  const selfExpandable = expandable && !onExpand

  const handleExport = useCallback(() => {
    if (!chartData || chartData.length === 0) return
    const csv = buildChartCsv(chartData)
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [chartData, title])

  const handleExpand = useCallback(() => {
    if (onExpand) {
      onExpand()
      return
    }

    setExpanded(true)
  }, [onExpand])

  const header = (
    <CardHeader className={cn('pb-2', expandable && 'pr-16')}>
      <div className="chart-card-heading">
        <div className="flex min-w-0 items-start gap-2">
          <CardTitle className="min-w-0 text-sm font-semibold break-words text-foreground">
            {title}
          </CardTitle>
          {info && <InfoButton text={info} />}
        </div>
        {summary && (
          <div className="chart-card-summary min-w-0 text-sm font-semibold text-foreground">
            {summary}
          </div>
        )}
      </div>
      {subtitle && <CardDescription className="mt-0.5">{subtitle}</CardDescription>}
    </CardHeader>
  )

  return (
    <>
      <ChartAnimationContext.Provider value={animationState}>
        <Card
          ref={cardRef}
          data-testid="chart-card"
          className={cn('group @container/chart-card relative', className)}
        >
          {header}
          <CardContent>{renderChildren(false)}</CardContent>
          {expandable && (
            <button
              type="button"
              onClick={handleExpand}
              tabIndex={isSectionVisible ? undefined : -1}
              className={EXPAND_BUTTON_CLASSNAME}
              title={t('common.expand')}
              aria-label={t('common.expandWithTitle', { title })}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </Card>
      </ChartAnimationContext.Provider>

      {selfExpandable && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <ZoomDialogContent
            title={title}
            description={subtitle ?? t('chartCard.expandedDescription')}
            actions={
              chartData && chartData.length > 0 ? (
                <button
                  type="button"
                  onClick={handleExport}
                  className="min-h-11 rounded-lg border border-border px-3 text-xs transition-colors hover:bg-accent"
                >
                  {t('chartCard.exportCsv')}
                </button>
              ) : undefined
            }
          >
            <ChartAnimationContext.Provider value={expandedChartAnimationState}>
              <ChartExpandedSurface>
                <div className="relative flex min-h-full flex-col gap-5">
                  {stats && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                          {t('dashboard.stats.min')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-medium">{fmt(stats.min)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                          {t('dashboard.stats.max')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-medium">{fmt(stats.max)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                          {t('dashboard.stats.avg')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-medium">{fmt(stats.avg)}</div>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                          {t('dashboard.stats.total')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-medium">
                          {fmt(stats.total)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-2.5 text-center">
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                          {t('dashboard.stats.dataPoints')}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-medium">{stats.count}</div>
                      </div>
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    {renderChildren(true)}
                    {expandedExtra}
                  </div>
                </div>
              </ChartExpandedSurface>
            </ChartAnimationContext.Provider>
          </ZoomDialogContent>
        </Dialog>
      )}
    </>
  )
}
