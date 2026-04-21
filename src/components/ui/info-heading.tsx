import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { InfoButton } from '@/components/ui/info-button'

interface InfoHeadingProps {
  children: ReactNode
  info?: string | undefined
  className?: string | undefined
}

/** Renders a heading paired with contextual help text. */
export function InfoHeading({ children, info, className }: InfoHeadingProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {children}
      {info && <InfoButton text={info} className="shrink-0" />}
    </div>
  )
}
