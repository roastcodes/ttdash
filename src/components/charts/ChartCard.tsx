import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface ChartCardProps {
  title: string
  children: ReactNode
  className?: string
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
