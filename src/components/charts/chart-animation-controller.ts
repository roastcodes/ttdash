import type { AnimationController } from 'recharts'

interface ChartAnimationControllerOptions {
  canAnimate?: () => boolean
  instantEntrance?: boolean
}

/** Adds an explicit interruption endpoint to Recharts' animation contract. */
export type ChartAnimationController = AnimationController & { finish: () => void }

/** Finishes hidden plots immediately and preserves each series through interrupted updates. */
export function createChartAnimationController({
  canAnimate = () => true,
  instantEntrance = false,
}: ChartAnimationControllerOptions = {}): ChartAnimationController {
  const introduced = new Set<string>()
  const running = new Set<() => void>()
  let hasEntered = false
  const controller: AnimationController = (clock, animation, update) => {
    const complete = () => {
      if (animation.getState() === 'init') animation.tick(0)
      if (animation.getState() === 'pending') {
        animation.tick((animation.getBeginStartedTime() ?? 0) + animation.getAnimationBegin())
      }
      animation.complete()
    }
    const id = animation.getAnimationId()
    const remember = () => {
      introduced.add(id)
      if (introduced.size > 128) introduced.delete(introduced.values().next().value!)
    }
    const skipEntrance = instantEntrance && !hasEntered
    hasEntered = true
    if (introduced.has(id) || skipEntrance || !canAnimate()) {
      // Enter the active state before completing so Recharts also clears its label suppression.
      complete()
      remember()
      update(animation.getTo())
      return () => {}
    }

    let cancel: (() => void) | undefined
    const finish = () => {
      cancel?.()
      cancel = undefined
      remember()
      complete()
      update(animation.getTo())
      running.delete(finish)
    }
    running.add(finish)
    const advance = (now: number) => {
      if (!canAnimate()) {
        finish()
        return
      }
      const remaining = animation.tick(now)
      if (animation.getState() === 'active') {
        remember()
        update(animation.getInterpolated())
        if (animation.getProgress() === 1) {
          animation.complete()
          cancel = undefined
          running.delete(finish)
          return
        }
      }
      cancel = clock.setTimeout(advance, remaining)
    }
    cancel = clock.setTimeout(advance, 0)
    return () => {
      cancel?.()
      remember()
      complete()
      running.delete(finish)
    }
  }
  return Object.assign(controller, { finish: () => [...running].forEach((finish) => finish()) })
}
