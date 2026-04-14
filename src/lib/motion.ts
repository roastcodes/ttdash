import { useReducedMotion } from 'framer-motion'

/** Returns whether the current user prefers reduced motion. */
export function useShouldReduceMotion() {
  return Boolean(useReducedMotion())
}

/** Omits motion-only utility classes when reduced motion is enabled. */
export function getMotionAwareClasses(shouldReduceMotion: boolean, motionClasses: string) {
  return shouldReduceMotion ? '' : motionClasses
}
