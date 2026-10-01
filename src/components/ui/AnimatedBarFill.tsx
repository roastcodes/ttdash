import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { motion, type MotionStyle } from 'framer-motion'
import { useDashboardElementMotion } from '@/components/dashboard/DashboardMotion'
import { cn } from '@/lib/cn'
import { APP_MOTION, useShouldReduceMotion } from '@/lib/motion'

interface AnimatedBarFillProps {
  width: string
  className?: string
  style?: CSSProperties
  active?: boolean
  order?: number
  delayMs?: number
  durationMs?: number
}

/** Animates one horizontal dashboard bar fill while respecting reduced motion. */
export function AnimatedBarFill({
  width,
  className,
  style,
  active,
  order = 0,
  delayMs,
  durationMs,
}: AnimatedBarFillProps) {
  const fillRef = useRef<HTMLDivElement | null>(null)
  const elementMotion = useDashboardElementMotion(fillRef, {
    kind: 'meter',
    observeParent: true,
    amount: 0.2,
    order,
    ...(delayMs !== undefined ? { delayMs } : {}),
  })
  const shouldReduceMotion = useShouldReduceMotion()
  const previousWidth = useRef(width)
  const isUpdate = previousWidth.current !== width
  useEffect(() => {
    previousWidth.current = width
  }, [width])
  const isActive = active ?? elementMotion.hasRevealed
  const resolvedDelayMs = isUpdate ? 0 : (delayMs ?? elementMotion.delayMs)
  const resolvedDurationMs =
    durationMs ?? (isUpdate ? APP_MOTION.updateDurationMs : APP_MOTION.meterDurationMs)
  const percentWidth = /^-?(?:\d+\.?\d*|\.\d+)%$/.test(width)
  const targetScale = percentWidth ? Math.max(0, parseFloat(width) / 100) : 1

  if (shouldReduceMotion) {
    return (
      <div
        ref={fillRef}
        className={cn(className)}
        style={{
          ...style,
          width: isActive ? width : '0%',
        }}
      />
    )
  }

  return (
    <motion.div
      ref={fillRef}
      className={cn(className)}
      style={
        { ...style, width: percentWidth ? '100%' : width, transformOrigin: 'left' } as MotionStyle
      }
      data-target-width={width}
      initial={false}
      animate={{ scaleX: isActive ? targetScale : 0 }}
      transition={{
        duration: elementMotion.canAnimate ? resolvedDurationMs / 1000 : 0,
        delay: elementMotion.canAnimate
          ? Math.min(resolvedDelayMs, APP_MOTION.maxStaggerMs) / 1000
          : 0,
        ease: APP_MOTION.ease,
      }}
    />
  )
}
