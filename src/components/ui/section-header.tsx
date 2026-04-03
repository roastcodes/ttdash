import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  className?: string
}

export function SectionHeader({ title, description, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 pl-3 border-l-2 border-primary/40', className)}>
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
        {badge && (
          <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted/50">
            {badge}
          </span>
        )}
        {description && (
          <span className="hidden sm:inline text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      {description && (
        <div className="mt-1 text-xs text-muted-foreground sm:hidden">{description}</div>
      )}
    </div>
  )
}
