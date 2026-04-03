import { createContext, useState, useMemo, useCallback, useContext, useRef, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'
import { InfoButton } from '@/components/features/help/InfoButton'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/formatters'

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

const ChartAnimationContext = createContext(false)

export function useChartAnimationActive() {
  return useContext(ChartAnimationContext)
}

export function ChartAnimationAware({ children }: { children: (active: boolean) => ReactNode }) {
  return <>{children(useChartAnimationActive())}</>
}

interface ChartRevealProps {
  children: ReactNode
  variant?: 'line' | 'bar' | 'radial'
  delay?: number
  duration?: number
}

export function ChartReveal({ children, variant = 'line', delay = 0, duration = 0.7 }: ChartRevealProps) {
  const active = useChartAnimationActive()
  const resolvedDuration = variant === 'radial' ? Math.max(duration, 0.95) : Math.max(duration, 0.9)

  const hidden = variant === 'bar'
    ? { opacity: 0, clipPath: 'inset(100% 0 0 0 round 16px)', y: 10 }
    : variant === 'radial'
      ? { opacity: 0, scale: 0.82, rotate: -18 }
      : { opacity: 0, clipPath: 'inset(0 100% 0 0 round 16px)', x: -8 }

  const visible = variant === 'bar'
    ? { opacity: 1, clipPath: 'inset(0 0 0 0 round 16px)', y: 0 }
    : variant === 'radial'
      ? { opacity: 1, scale: 1, rotate: 0 }
      : { opacity: 1, clipPath: 'inset(0 0 0 0 round 16px)', x: 0 }

  return (
    <motion.div
      initial={hidden}
      animate={active ? visible : hidden}
      transition={{ duration: resolvedDuration, delay, ease: 'easeOut' }}
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
    </motion.div>
  )
}

export function ChartCard({ title, subtitle, summary, info, expandable = true, children, className, chartData, valueKey, valueFormatter, expandedExtra }: ChartCardProps) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(cardRef, { once: true, amount: 0.25 })
  const animationActive = isInView || expanded

  const stats = useMemo(() => {
    if (!chartData || !valueKey) return null
    const values = chartData.map(d => d[valueKey]).filter((v): v is number => typeof v === 'number' && !isNaN(v))
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
  const renderChildren = (isExpanded: boolean) => typeof children === 'function'
    ? children(isExpanded)
    : children

  const handleExport = useCallback(() => {
    if (!chartData || chartData.length === 0) return
    const keys = Object.keys(chartData[0])
    const csv = [keys.join(','), ...chartData.map(row => keys.map(k => String(row[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [chartData, title])

  const header = (
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {info && <InfoButton text={info} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {summary && (
            <span className="text-sm font-semibold text-foreground">{summary}</span>
          )}
        </div>
      </div>
      {subtitle && (
        <CardDescription className="mt-0.5">{subtitle}</CardDescription>
      )}
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
              onClick={() => setExpanded(true)}
              className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Vergrössern"
              aria-label={`${title} vergrössern`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </Card>
      </ChartAnimationContext.Provider>

      {expandable && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-[96vw] w-[96vw] sm:max-w-[95vw] sm:w-[95vw] max-h-[92vh] h-[92vh] sm:max-h-[90vh] sm:h-[90vh] overflow-auto p-0">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              Vergrösserte Diagrammansicht mit Statistik-Zusammenfassung und optionalem CSV-Export.
            </DialogDescription>
            <ChartAnimationContext.Provider value={expanded}>
              <div className="relative h-full flex flex-col">
                  <div className="p-4 sm:p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{title}</h2>
                      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    {chartData && chartData.length > 0 && (
                      <button
                        onClick={handleExport}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-foreground"
                      >
                        CSV Export
                      </button>
                    )}
                  </div>
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                      <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Min</div>
                        <div className="font-mono font-medium text-sm mt-0.5">{fmt(stats.min)}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Max</div>
                        <div className="font-mono font-medium text-sm mt-0.5">{fmt(stats.max)}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Durchschnitt</div>
                        <div className="font-mono font-medium text-sm mt-0.5">{fmt(stats.avg)}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gesamt</div>
                        <div className="font-mono font-medium text-sm mt-0.5">{fmt(stats.total)}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Datenpunkte</div>
                        <div className="font-mono font-medium text-sm mt-0.5">{stats.count}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 sm:p-6 pt-2 overflow-auto">
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
