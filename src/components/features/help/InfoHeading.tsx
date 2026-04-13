import type { ReactNode } from 'react'
import { InfoButton } from '@/components/features/help/InfoButton'
import { cn } from '@/lib/cn'

interface InfoHeadingProps {
  children: ReactNode
  info?: string | undefined
  className?: string | undefined
}

export function InfoHeading({ children, info, className }: InfoHeadingProps) {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {children}
      {info && <InfoButton text={info} className="shrink-0" />}
    </div>
  )
}
