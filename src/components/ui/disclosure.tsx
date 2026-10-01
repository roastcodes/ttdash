import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { DashboardMotionItem } from '@/components/dashboard/DashboardMotion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

interface DisclosureProps {
  label: string
  children: ReactNode
  defaultOpen?: boolean
  desktopOpen?: boolean
  className?: string
  testId?: string
}

/** Keeps supplementary information accessible without crowding the first dashboard view. */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  desktopOpen = false,
  className,
  testId,
}: DisclosureProps) {
  const id = useId()
  const shouldReduceMotion = useShouldReduceMotion()
  const [open, setOpen] = useState(
    () =>
      defaultOpen ||
      (desktopOpen &&
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches),
  )
  const [prepared, setPrepared] = useState(open)
  return (
    <div className={className} data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setPrepared(true)
          setOpen(!open)
        }}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0',
            !shouldReduceMotion && 'transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
      <div id={id} hidden={!open}>
        {prepared && (
          <DashboardMotionItem delayMs={0} className="pt-3">
            {children}
          </DashboardMotionItem>
        )}
      </div>
    </div>
  )
}
