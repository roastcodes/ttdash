import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'

interface MetricCardProps {
  label: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label?: string } | null
  className?: string
}

export function MetricCard({ label, value, subtitle, icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('p-4 flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2">
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && trend.value !== 0 && (
          <span className={cn(
            'text-xs font-medium',
            trend.value > 0 ? 'text-red-400' : 'text-green-400'
          )}>
            {trend.value > 0 ? '↑' : '↓'}{Math.abs(trend.value).toFixed(1)}%
            {trend.label && ` ${trend.label}`}
          </span>
        )}
      </div>
    </Card>
  )
}
