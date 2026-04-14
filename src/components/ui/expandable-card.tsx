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
          className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 motion-reduce:transition-none p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title={t('common.expand')}
          aria-label={title ? t('common.expandWithTitle', { title }) : t('common.expand')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className={cn(
            'max-w-[96vw] w-[96vw] sm:max-w-[95vw] sm:w-[95vw] max-h-[92vh] h-[92vh] sm:max-h-[90vh] sm:h-[90vh] overflow-auto p-4 sm:p-6',
            expandedClassName,
          )}
        >
          <DialogTitle className="sr-only">{title ?? t('common.expand')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('common.expandedCardDescription')}
          </DialogDescription>
          <div className="h-full">
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {stats.map((s) => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-muted/20 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </div>
                    <div className="font-mono font-medium text-sm mt-0.5">{s.value}</div>
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
