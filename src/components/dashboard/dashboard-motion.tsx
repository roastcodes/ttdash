import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

/** Defines the shared dashboard motion timings for section reveal and child chart orchestration. */
export const DASHBOARD_MOTION = {
  sectionPreloadMargin: '0px 0px 18% 0px',
  sectionRevealAmount: 0.18,
  sectionRevealOffset: 14,
  sectionRevealDuration: 0.36,
  sectionRevealEase: [0.22, 1, 0.36, 1] as const,
  chartStartDelayMs: 120,
  meterStartDelayMs: 180,
  meterDurationMs: 560,
}

interface DashboardSectionMotionState {
  sectionVisible: boolean
  chartStartDelayMs: number
  meterStartDelayMs: number
  shouldReduceMotion: boolean
}

const DashboardSectionMotionContext = createContext<DashboardSectionMotionState | null>(null)

/** Returns the current dashboard section motion state when available. */
export function useDashboardSectionMotion() {
  return useContext(DashboardSectionMotionContext)
}

interface AnimatedDashboardSectionProps {
  id: string
  children: ReactNode
  className?: string
  contentClassName?: string
  placeholderClassName?: string
  eager?: boolean
}

/** Gates one dashboard section by viewport visibility and exposes motion timing to descendants. */
export function AnimatedDashboardSection({
  id,
  children,
  className,
  contentClassName,
  placeholderClassName,
  eager = false,
}: AnimatedDashboardSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const shouldReduceMotion = useShouldReduceMotion()
  const [shouldMount, setShouldMount] = useState(eager)
  const [sectionVisible, setSectionVisible] = useState(eager)

  useEffect(() => {
    if (eager) {
      setShouldMount(true)
      setSectionVisible(true)
      return
    }

    const element = sectionRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setShouldMount(true)
      setSectionVisible(true)
      return
    }

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setShouldMount(true)
          preloadObserver.disconnect()
        }
      },
      {
        rootMargin: DASHBOARD_MOTION.sectionPreloadMargin,
        threshold: 0,
      },
    )

    const revealObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setShouldMount(true)
          setSectionVisible(true)
          revealObserver.disconnect()
        }
      },
      {
        threshold: DASHBOARD_MOTION.sectionRevealAmount,
      },
    )

    preloadObserver.observe(element)
    revealObserver.observe(element)

    return () => {
      preloadObserver.disconnect()
      revealObserver.disconnect()
    }
  }, [eager])

  const contextValue = useMemo<DashboardSectionMotionState>(
    () => ({
      sectionVisible,
      chartStartDelayMs: DASHBOARD_MOTION.chartStartDelayMs,
      meterStartDelayMs: DASHBOARD_MOTION.meterStartDelayMs,
      shouldReduceMotion,
    }),
    [sectionVisible, shouldReduceMotion],
  )

  return (
    <section
      id={id}
      ref={sectionRef}
      className={className}
      data-section-mounted={shouldMount ? 'true' : 'false'}
      data-section-visible={sectionVisible ? 'true' : 'false'}
    >
      {!shouldMount ? (
        <div
          aria-hidden="true"
          className={cn(
            'rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl',
            placeholderClassName ?? 'min-h-[320px]',
          )}
        />
      ) : (
        <DashboardSectionMotionContext.Provider value={contextValue}>
          {shouldReduceMotion ? (
            <div className={contentClassName} style={sectionVisible ? undefined : { opacity: 0 }}>
              {children}
            </div>
          ) : (
            <motion.div
              initial={false}
              animate={
                sectionVisible
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: DASHBOARD_MOTION.sectionRevealOffset }
              }
              transition={{
                duration: DASHBOARD_MOTION.sectionRevealDuration,
                ease: DASHBOARD_MOTION.sectionRevealEase,
              }}
              className={contentClassName}
            >
              {children}
            </motion.div>
          )}
        </DashboardSectionMotionContext.Provider>
      )}
    </section>
  )
}
