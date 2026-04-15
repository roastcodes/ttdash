import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ExpandableCardProps {
  children: ReactNode
  title?: string
  className?: string
  expandedClassName?: string
  stats?: { label: string; value: string }[]
}

/** Wraps card content in an expandable dashboard surface. */
export function ExpandableCard({
  children,
  title,
  className,
  expandedClassName,
  stats,
}: ExpandableCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className={cn('group relative', className)}>
        {children}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute top-3 right-3 z-10 rounded-lg border border-border/50 bg-background/80 p-1.5 text-muted-foreground opacity-100 backdrop-blur-sm transition-opacity duration-200 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
          title={t('common.expand')}
          aria-label={title ? t('common.expandWithTitle', { title }) : t('common.expand')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className={cn(
            'h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] overflow-auto p-4 sm:h-[90vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[95vw] sm:p-6',
            expandedClassName,
          )}
        >
          <DialogTitle className="sr-only">{title ?? t('common.expand')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('common.expandedCardDescription')}
          </DialogDescription>
          <div className="h-full">
            {stats && stats.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-lg bg-muted/20 p-2.5 text-center">
                    <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                      {s.label}
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-medium">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
