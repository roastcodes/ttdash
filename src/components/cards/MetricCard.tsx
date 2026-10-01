import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { InfoButton } from '@/components/ui/InfoButton'
import { cn } from '@/lib/cn'

interface MetricCardProps {
  label: ReactNode
  value: ReactNode
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label?: string } | null
  info?: string
  className?: string
  compact?: boolean
}

/** Renders one compact KPI card with optional trend and tooltip support. */
export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  info,
  className,
  compact = false,
}: MetricCardProps) {
  const trendClassName =
    trend && trend.value > 0
      ? 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300'
      : 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300'

  return (
    <Card
      className={cn(
        'flex min-h-[122px] flex-col gap-1 p-4',
        compact && 'min-h-[94px] gap-0.5 p-3',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-1 text-xs leading-tight font-medium text-balance text-muted-foreground">
          {label}
          {info && <InfoButton text={info} />}
        </span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl leading-tight font-semibold tracking-tight break-words tabular-nums">
        {value}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {subtitle && <span className="text-xs text-pretty text-muted-foreground">{subtitle}</span>}
        {trend && trend.value !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
              trendClassName,
            )}
          >
            {trend.value > 0 ? '↑' : '↓'}
            {Math.abs(trend.value).toFixed(1)}%{trend.label && ` ${trend.label}`}
          </span>
        )}
      </div>
    </Card>
  )
}
