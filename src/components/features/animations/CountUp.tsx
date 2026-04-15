import { useState, useEffect, useRef } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  formatter?: (value: number) => string
  className?: string
}

/** Animates a numeric value from zero to its final display value. */
export function CountUp({ end, duration = 800, formatter, className }: CountUpProps) {
  const [current, setCurrent] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCurrent(end * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [end, duration])

  const display = formatter ? formatter(current) : Math.round(current).toString()

  return <span className={className}>{display}</span>
}
