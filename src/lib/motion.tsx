import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject,
  type ReactNode,
} from 'react'
import { MotionConfig } from 'framer-motion'
import type { ReducedMotionPreference } from '@/types'

interface MotionPreferenceContextValue {
  preference: ReducedMotionPreference
  shouldReduceMotion: boolean
}

const MotionPreferenceContext = createContext<MotionPreferenceContextValue | null>(null)

/** Defines the shared app motion timings used across charts, meters, and dialogs. */
export const APP_MOTION = {
  ease: [0.22, 1, 0.36, 1] as const,
  staggerMs: 35,
  maxStaggerMs: 140,
  meterDurationMs: 420,
  updateDurationMs: 200,
}

function subscribeDocumentVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

function getDocumentVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

/** Tracks live intersection, including clipping by scrollable dialogs, without replaying content. */
export function useMotionVisibility<T extends Element>(
  ref: RefObject<T | null>,
  amount = 0.2,
  observeParent = false,
) {
  const observerAvailable = typeof IntersectionObserver !== 'undefined'
  const [isInView, setIsInView] = useState(!observerAvailable)
  const documentVisible = useSyncExternalStore(
    subscribeDocumentVisibility,
    getDocumentVisible,
    () => true,
  )

  useEffect(() => {
    const element = observeParent ? ref.current?.parentElement : ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(Boolean(entry?.isIntersecting)),
      { threshold: amount },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [amount, observeParent, ref])

  return {
    isInView: isInView && documentVisible,
    canAnimate: observerAvailable && isInView && documentVisible,
  }
}

function getSystemReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useSystemReducedMotion(enabled = true) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(() =>
    enabled ? getSystemReducedMotion() : false,
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setShouldReduceMotion(false)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => {
      setShouldReduceMotion(mediaQuery.matches)
    }

    handleChange()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [enabled])

  return shouldReduceMotion
}

function toMotionConfigMode(preference: ReducedMotionPreference): 'always' | 'never' | 'user' {
  if (preference === 'always') return 'always'
  if (preference === 'never') return 'never'
  return 'user'
}

/** Applies the current app-wide reduced-motion preference to the subtree. */
export function AppMotionProvider({
  preference,
  children,
}: {
  preference: ReducedMotionPreference
  children: ReactNode
}) {
  const systemReducedMotion = useSystemReducedMotion(preference === 'system')
  const shouldReduceMotion =
    preference === 'always' ? true : preference === 'never' ? false : systemReducedMotion
  const contextValue = useMemo(
    () => ({
      preference,
      shouldReduceMotion,
    }),
    [preference, shouldReduceMotion],
  )

  return (
    <MotionPreferenceContext.Provider value={contextValue}>
      <MotionConfig reducedMotion={toMotionConfigMode(preference)}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  )
}

/** Returns whether the current user prefers reduced motion. */
export function useShouldReduceMotion() {
  const contextValue = useContext(MotionPreferenceContext)
  const systemReducedMotion = useSystemReducedMotion(contextValue === null)
  return contextValue?.shouldReduceMotion ?? systemReducedMotion
}

/** Omits motion-only utility classes when reduced motion is enabled. */
export function getMotionAwareClasses(shouldReduceMotion: boolean, motionClasses: string) {
  return shouldReduceMotion ? '' : motionClasses
}
