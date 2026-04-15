import { motion, type MotionStyle } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useDashboardSectionMotion } from '@/components/dashboard/dashboard-motion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

interface AnimatedBarFillProps {
  width: string
  className?: string
  style?: CSSProperties
  active?: boolean
  delayMs?: number
  durationMs?: number
}

/** Animates one horizontal dashboard bar fill while respecting reduced motion. */
export function AnimatedBarFill({
  width,
  className,
  style,
  active,
  delayMs,
  durationMs,
}: AnimatedBarFillProps) {
  const sectionMotion = useDashboardSectionMotion()
  const shouldReduceMotion = useShouldReduceMotion()
  const isActive = active ?? sectionMotion?.sectionVisible ?? true
  const resolvedDelayMs = delayMs ?? sectionMotion?.meterStartDelayMs ?? 180
  const resolvedDurationMs = durationMs ?? 560

  if (shouldReduceMotion) {
    return (
      <div
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
