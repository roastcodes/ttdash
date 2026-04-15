import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

/** Defines the shared dashboard motion timings for section reveal and child chart orchestration. */
export const DASHBOARD_MOTION = {
  sectionPreloadMargin: '0px 0px 45% 0px',
  sectionRevealAmount: 0.14,
  sectionRevealOffset: 12,
  sectionRevealDuration: 0.6,
  sectionRevealEase: [0.22, 1, 0.36, 1] as const,
  placeholderFadeDuration: 0.34,
  itemRevealAmount: 0.24,
  itemRevealOffset: 8,
  itemRevealDuration: 0.42,
  itemStaggerMs: 105,
  chartStartDelayMs: 285,
  meterStartDelayMs: 375,
  meterDurationMs: 960,
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

interface DashboardElementMotionOptions {
  amount?: number
  kind?: 'chart' | 'meter' | 'item'
  order?: number
  delayMs?: number
}

interface DashboardElementMotionState {
  active: boolean
  runKey: number
  delayMs: number
  shouldReduceMotion: boolean
}

/** Tracks one dashboard element and only activates motion once the element itself is visible. */
export function useDashboardElementMotion<T extends Element>(
  ref: RefObject<T | null>,
  {
    amount = DASHBOARD_MOTION.itemRevealAmount,
    kind = 'item',
    order = 0,
    delayMs,
  }: DashboardElementMotionOptions = {},
): DashboardElementMotionState {
  const sectionMotion = useDashboardSectionMotion()
  const shouldReduceMotion = useShouldReduceMotion()
  const isInView = useInView(ref, { once: true, amount })
  const active = (sectionMotion?.sectionVisible ?? true) && isInView
  const [runKey, setRunKey] = useState(0)
  const previousActiveRef = useRef(false)

  useEffect(() => {
    if (active && !previousActiveRef.current) {
      setRunKey((current) => current + 1)
    }
    previousActiveRef.current = active
  }, [active])

  const baseDelayMs =
    delayMs ??
    (kind === 'meter'
      ? (sectionMotion?.meterStartDelayMs ?? DASHBOARD_MOTION.meterStartDelayMs)
      : (sectionMotion?.chartStartDelayMs ?? DASHBOARD_MOTION.chartStartDelayMs))

  return {
    active: shouldReduceMotion ? true : active,
    runKey,
    delayMs: baseDelayMs + order * DASHBOARD_MOTION.itemStaggerMs,
    shouldReduceMotion,
  }
}

interface DashboardMotionItemProps {
  children: ReactNode
  className?: string
  order?: number
  delayMs?: number
  amount?: number
}

/** Reveals one dashboard child element with the shared timing policy. */
export function DashboardMotionItem({
  children,
  className,
  order = 0,
  delayMs,
  amount,
}: DashboardMotionItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null)
  const itemMotion = useDashboardElementMotion(itemRef, {
    kind: 'item',
    order,
    ...(delayMs !== undefined ? { delayMs } : {}),
    ...(amount !== undefined ? { amount } : {}),
  })

  if (itemMotion.shouldReduceMotion) {
    return (
      <div ref={itemRef} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={itemRef}
      className={className}
      initial={false}
      animate={
        itemMotion.active
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: DASHBOARD_MOTION.itemRevealOffset }
      }
      transition={{
        duration: DASHBOARD_MOTION.itemRevealDuration,
        delay: itemMotion.active ? itemMotion.delayMs / 1000 : 0,
        ease: DASHBOARD_MOTION.sectionRevealEase,
      }}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedDashboardSectionProps {
  id: string
  children: ReactNode
  className?: string
  contentClassName?: string
  placeholderClassName?: string
  eager?: boolean
  onPreload?: (() => void | Promise<unknown>) | undefined
}

/** Gates one dashboard section by viewport visibility and exposes motion timing to descendants. */
export function AnimatedDashboardSection({
  id,
  children,
  className,
  contentClassName,
  placeholderClassName,
  eager = false,
  onPreload,
}: AnimatedDashboardSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const hasTriggeredPreloadRef = useRef(false)
  const preloadPromiseRef = useRef<Promise<unknown> | null>(null)
  const isMountedRef = useRef(true)
  const shouldReduceMotion = useShouldReduceMotion()
  const [contentPrepared, setContentPrepared] = useState(eager)
  const [sectionVisible, setSectionVisible] = useState(eager)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const triggerPreload = useCallback(() => {
    if (hasTriggeredPreloadRef.current) return preloadPromiseRef.current

    hasTriggeredPreloadRef.current = true

    if (!onPreload) {
      setContentPrepared(true)
      const preloadTask = Promise.resolve()
      preloadPromiseRef.current = preloadTask
      return preloadTask
    }

    const preloadTask = Promise.resolve(onPreload())
      .catch(() => undefined)
      .finally(() => {
        if (isMountedRef.current) {
          setContentPrepared(true)
        }
      })

    preloadPromiseRef.current = preloadTask
    return preloadTask
  }, [onPreload])

  useEffect(() => {
    if (eager) {
      void triggerPreload()
      setSectionVisible(true)
      return
    }

    const element = sectionRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      void triggerPreload()
      setSectionVisible(true)
      return
    }

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          void triggerPreload()
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
          void triggerPreload()
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
  }, [eager, triggerPreload])

  const shouldRenderContent = eager || contentPrepared
  const showPlaceholder = !sectionVisible

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
      className={cn('relative', className)}
      data-section-mounted={shouldRenderContent ? 'true' : 'false'}
      data-section-visible={sectionVisible ? 'true' : 'false'}
    >
      {!shouldRenderContent ? (
        <div
          aria-hidden="true"
          className={cn(
            'rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl',
            placeholderClassName ?? 'min-h-[320px]',
          )}
        />
      ) : (
        <DashboardSectionMotionContext.Provider value={contextValue}>
          <div className="relative">
            {shouldReduceMotion ? (
              <div
                className={contentClassName}
                style={sectionVisible ? undefined : { opacity: 0 }}
                aria-hidden={sectionVisible ? undefined : true}
              >
                {children}
              </div>
            ) : (
              <motion.div
                initial={{
                  opacity: 0,
                  y: DASHBOARD_MOTION.sectionRevealOffset,
                }}
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
                aria-hidden={sectionVisible ? undefined : true}
              >
                {children}
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {showPlaceholder &&
                (shouldReduceMotion ? (
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-0 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl',
                      placeholderClassName ?? 'min-h-[320px]',
                    )}
                  />
                ) : (
                  <motion.div
                    key="section-placeholder"
                    aria-hidden="true"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DASHBOARD_MOTION.placeholderFadeDuration }}
                    className={cn(
                      'pointer-events-none absolute inset-0 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl',
                      placeholderClassName ?? 'min-h-[320px]',
                    )}
                  />
                ))}
            </AnimatePresence>
          </div>
        </DashboardSectionMotionContext.Provider>
      )}
    </section>
  )
}
