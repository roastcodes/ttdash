import { useReducedMotion } from 'framer-motion'

export function useShouldReduceMotion() {
  return Boolean(useReducedMotion())
}

export function getMotionAwareClasses(shouldReduceMotion: boolean, motionClasses: string) {
  return shouldReduceMotion ? '' : motionClasses
}
