import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { InfoButton } from '@/components/features/help/InfoButton'
import { cn } from '@/lib/cn'

interface MetricCardProps {
  label: ReactNode
  value: ReactNode
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label?: string } | null
  info?: string
  className?: string
}

export function MetricCard({ label, value, subtitle, icon, trend, info, className }: MetricCardProps) {
  return (
    <Card className={cn('p-4 flex flex-col gap-1 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs text-muted-foreground font-medium flex items-start gap-1 leading-tight">
          {label}
          {info && <InfoButton text={info} />}
        </span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2">
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && trend.value !== 0 && (
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5',
            trend.value > 0
              ? 'text-red-400 bg-red-400/10'
              : 'text-green-400 bg-green-400/10'
          )}>
            {trend.value > 0 ? '↑' : '↓'}{Math.abs(trend.value).toFixed(1)}%
            {trend.label && ` ${trend.label}`}
          </span>
        )}
      </div>
    </Card>
  )
}
