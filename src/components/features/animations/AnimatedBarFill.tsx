import { motion, type MotionStyle } from 'framer-motion'
import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { DASHBOARD_MOTION, useDashboardElementMotion } from '@/components/dashboard/DashboardMotion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

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
    amount: 0.2,
    order,
    ...(delayMs !== undefined ? { delayMs } : {}),
  })
  const shouldReduceMotion = useShouldReduceMotion()
  const isActive = active ?? elementMotion.active
  const resolvedDelayMs = delayMs ?? elementMotion.delayMs
  const resolvedDurationMs = durationMs ?? DASHBOARD_MOTION.meterDurationMs

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
      {...(style ? { style: style as unknown as MotionStyle } : {})}
      initial={false}
      animate={{ width: isActive ? width : '0%' }}
      transition={{
        duration: resolvedDurationMs / 1000,
        delay: isActive ? resolvedDelayMs / 1000 : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  )
}
