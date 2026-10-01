import { useEffect, useRef } from 'react'
import { useDashboardElementMotion } from '@/components/dashboard/DashboardMotion'
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

/** Reveals stacked segments with transforms and briefly highlights visible value updates. */
export function AnimatedSegmentedBar({
  segments,
  className,
  segmentClassName,
  durationMs = APP_MOTION.meterDurationMs,
  staggerMs = APP_MOTION.staggerMs,
  'data-testid': dataTestId,
}: AnimatedSegmentedBarProps) {
  const shouldReduceMotion = useShouldReduceMotion()
  const barRef = useRef<HTMLDivElement | null>(null)
  const visibility = useDashboardElementMotion(barRef, { kind: 'meter', delayMs: 0 })
  const signature = segments.map((segment) => `${segment.id}:${segment.width}`).join('|')
  const previousSignature = useRef(signature)
  const isUpdate = previousSignature.current !== signature
  useEffect(() => {
    previousSignature.current = signature
  }, [signature])

  return (
    <motion.div
      ref={barRef}
      className={cn('flex overflow-hidden rounded-full', className)}
      data-testid={dataTestId}
      initial={false}
      animate={{ opacity: isUpdate && visibility.canAnimate ? [0.7, 1] : 1 }}
      transition={{ duration: visibility.canAnimate ? APP_MOTION.updateDurationMs / 1000 : 0 }}
    >
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
            style={{ width, backgroundColor: segment.color, transformOrigin: 'left' }}
            initial={false}
            animate={{ scaleX: visibility.hasRevealed ? 1 : 0 }}
            transition={{
              duration: visibility.canAnimate ? durationMs / 1000 : 0,
              delay: visibility.canAnimate
                ? Math.min(index * staggerMs, APP_MOTION.maxStaggerMs) / 1000
                : 0,
              ease: APP_MOTION.ease,
            }}
            title={segment.label}
            aria-label={segment.label}
            data-testid={segmentTestId}
            data-animate={String(visibility.canAnimate)}
            data-target-width={width}
            data-delay-ms={String(Math.min(index * staggerMs, APP_MOTION.maxStaggerMs))}
            data-duration-ms={String(durationMs)}
          />
        )
      })}
    </motion.div>
  )
}
