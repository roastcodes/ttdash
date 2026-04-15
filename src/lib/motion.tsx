import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import type { ReducedMotionPreference } from '@/types'

interface MotionPreferenceContextValue {
  preference: ReducedMotionPreference
  shouldReduceMotion: boolean
}

const MotionPreferenceContext = createContext<MotionPreferenceContextValue | null>(null)

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
  const systemReducedMotion = useSystemReducedMotion()
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
