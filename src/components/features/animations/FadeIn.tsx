import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useShouldReduceMotion } from '@/lib/motion'

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

/** Reveals content when it enters the viewport. */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
  direction = 'up',
}: FadeInProps) {
  const shouldReduceMotion = useShouldReduceMotion()
  const offsets = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  }

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
