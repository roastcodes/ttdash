import {
  createContext,
  useState,
  useMemo,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'
import { InfoButton } from '@/components/features/help/InfoButton'
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

const ChartAnimationContext = createContext(false)

/** Returns whether chart-specific animation should currently run. */
export function useChartAnimationActive() {
  return useContext(ChartAnimationContext)
}

/** Exposes the current chart animation state to a render prop. */
export function ChartAnimationAware({ children }: { children: (active: boolean) => ReactNode }) {
  const shouldReduceMotion = useShouldReduceMotion()
  const animationActive = useChartAnimationActive()
  return <>{children(shouldReduceMotion ? false : animationActive)}</>
}

interface ChartRevealProps {
  children: ReactNode
  variant?: 'line' | 'bar' | 'radial'
}

/** Wraps chart content in the shared reveal policy for its chart variant. */
export function ChartReveal({ children, variant = 'line' }: ChartRevealProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: variant === 'radial' ? 'visible' : 'hidden',
        transformOrigin: variant === 'bar' ? 'center bottom' : 'center center',
        paddingTop: variant === 'radial' ? 8 : 0,
        paddingBottom: variant === 'radial' ? 8 : 0,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

/** Renders a chart card with export, expand, and stats affordances. */
export function ChartCard({
  title,
  subtitle,
  summary,
  info,
  expandable = true,
  children,
  className,
  chartData,
  valueKey,
  valueFormatter,
  expandedExtra,
}: ChartCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(cardRef, { once: true, amount: 0.25 })
  const animationActive = isInView || expanded

  const stats = useMemo(() => {
    if (!chartData || !valueKey) return null
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
  }, [chartData, valueKey])

  const fmt = valueFormatter ?? formatCurrency
  const renderChildren = (isExpanded: boolean) =>
    typeof children === 'function' ? children(isExpanded) : children

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

  const header = (
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {info && <InfoButton text={info} />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {summary && <span className="text-sm font-semibold text-foreground">{summary}</span>}
        </div>
      </div>
      {subtitle && <CardDescription className="mt-0.5">{subtitle}</CardDescription>}
    </CardHeader>
  )

  return (
    <>
      <ChartAnimationContext.Provider value={animationActive}>
        <Card ref={cardRef} className={cn('group relative', className)}>
          {header}
          <CardContent>{renderChildren(false)}</CardContent>
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute top-3 right-3 z-10 rounded-lg border border-border/50 bg-background/80 p-1.5 text-muted-foreground opacity-100 backdrop-blur-sm transition-opacity duration-200 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
              title={t('common.expand')}
              aria-label={t('common.expandWithTitle', { title })}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </Card>
      </ChartAnimationContext.Provider>

      {expandable && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] overflow-auto p-0 sm:h-[90vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[95vw]">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('chartCard.expandedDescription')}
            </DialogDescription>
            <ChartAnimationContext.Provider value={expanded}>
              <div className="relative flex h-full flex-col">
                <div className="p-4 pb-2 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{title}</h2>
                      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                    </div>
                    {chartData && chartData.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExport}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
                      >
                        {t('chartCard.exportCsv')}
                      </button>
                    )}
                  </div>
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
                </div>
                <div className="flex-1 overflow-auto p-4 pt-2 sm:p-6">
                  {renderChildren(true)}
                  {expandedExtra}
                </div>
              </div>
            </ChartAnimationContext.Provider>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
