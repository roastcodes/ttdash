import type { ReactNode } from 'react'
import { InfoHeading } from '@/components/ui/info-heading'
import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  info?: string
  className?: string
}

/** Renders a section heading with optional badge and inline help. */
export function SectionHeader({ title, description, badge, info, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 border-l-2 border-primary/40 pl-3', className)}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <InfoHeading info={info}>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        </InfoHeading>
        {badge && (
          <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {badge}
          </span>
        )}
        {description && (
          <span className="hidden text-xs text-muted-foreground sm:inline">{description}</span>
        )}
      </div>
      {description && (
        <div className="mt-1 text-xs text-muted-foreground sm:hidden">{description}</div>
      )}
    </div>
  )
}
