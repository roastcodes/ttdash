import { useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ExpandableCardProps {
  children: ReactNode
  title?: string
  className?: string
  expandedClassName?: string
  stats?: { label: string; value: string }[]
}

export function ExpandableCard({ children, title, className, expandedClassName, stats }: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div className={cn('group relative', className)}>
        {children}
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Vergrössern"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className={cn(
          'max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] overflow-auto p-6',
          expandedClassName
        )}>
          <DialogTitle className="sr-only">{title ?? 'Vergrösserte Ansicht'}</DialogTitle>
          <div className="h-full">
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {stats.map(s => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-muted/20 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
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
