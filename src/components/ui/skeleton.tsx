import { cn } from '@/lib/cn'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} {...props} />
}

function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/80 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl', className)}
    >
      <div className="p-4 pb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-4 pt-0">
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-1 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3 px-1 py-2">
        <Skeleton className="h-9 w-[160px] rounded-lg" />
        <Skeleton className="h-9 w-[180px] rounded-lg" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Primary metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Chart area */}
        <ChartCardSkeleton className="h-[200px]" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCardSkeleton className="lg:col-span-2" />
          <ChartCardSkeleton />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, MetricCardSkeleton, ChartCardSkeleton, DashboardSkeleton }
