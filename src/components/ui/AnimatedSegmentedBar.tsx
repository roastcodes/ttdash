import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { APP_MOTION, useShouldReduceMotion } from '@/lib/motion'

interface AnimatedSegmentedBarSegment {
  id: string
  width: number
  color: string
  label: string
}

interface AnimatedSegmentedBarProps {
  segments: AnimatedSegmentedBarSegment[]
  className?: string
  segmentClassName?: string
  durationMs?: number
  staggerMs?: number
  'data-testid'?: string
}

/** Renders a stacked bar that animates each segment width unless reduced motion is enabled. */
export function AnimatedSegmentedBar({
  segments,
  className,
  segmentClassName,
  durationMs = APP_MOTION.meterDurationMs,
  staggerMs = APP_MOTION.staggerMs,
  'data-testid': dataTestId,
}: AnimatedSegmentedBarProps) {
  const shouldReduceMotion = useShouldReduceMotion()

  return (
    <div className={cn('flex overflow-hidden rounded-full', className)} data-testid={dataTestId}>
      {segments.map((segment, index) => {
        const clampedWidth = Math.max(0, Math.min(100, segment.width))
        const width = `${clampedWidth}%`
        const segmentTestId = dataTestId ? `${dataTestId}-${segment.id}` : undefined

        if (shouldReduceMotion) {
          return (
            <div
              key={segment.id}
              className={cn('h-full flex-shrink-0', segmentClassName)}
              style={{ width, backgroundColor: segment.color }}
              title={segment.label}
              aria-label={segment.label}
              data-testid={segmentTestId}
              data-animate="false"
              data-target-width={width}
              data-delay-ms="0"
              data-duration-ms="0"
            />
          )
        }

        return (
          <motion.div
            key={segment.id}
            className={cn('h-full flex-shrink-0', segmentClassName)}
            style={{ backgroundColor: segment.color }}
            initial={{ width: '0%' }}
            animate={{ width }}
            transition={{
              duration: durationMs / 1000,
              delay: (index * staggerMs) / 1000,
              ease: APP_MOTION.ease,
            }}
            title={segment.label}
            aria-label={segment.label}
            data-testid={segmentTestId}
            data-animate="true"
            data-target-width={width}
            data-delay-ms={String(index * staggerMs)}
            data-duration-ms={String(durationMs)}
          />
        )
      })}
    </div>
  )
}
