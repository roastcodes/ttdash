import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EXPAND_BUTTON_CLASSNAME } from '@/components/ui/expand-button-styles'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ExpandableCardProps {
  children: ReactNode
  title?: string
  className?: string
  expandedClassName?: string
  stats?: { label: string; value: string }[]
  onExpand?: () => void
}

/** Wraps card content in an expandable dashboard surface. */
export function ExpandableCard({
  children,
  title,
  className,
  expandedClassName,
  stats,
  onExpand,
}: ExpandableCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className={cn('group relative', className)}>
        {children}
        <button
          type="button"
          onClick={() => {
            if (onExpand) {
              onExpand()
              return
            }
            setExpanded(true)
          }}
          className={EXPAND_BUTTON_CLASSNAME}
          title={t('common.expand')}
          aria-label={title ? t('common.expandWithTitle', { title }) : t('common.expand')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {!onExpand && (
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
      )}
    </>
  )
}
