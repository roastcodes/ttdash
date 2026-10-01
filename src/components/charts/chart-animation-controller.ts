import type { AnimationController } from 'recharts'

/** Runs each plot-data animation once, so visibility changes never restart its entrance. */
export function createChartAnimationController(): AnimationController {
  const introduced = new Set<string>()
  return (clock, animation, update) => {
    const complete = () => {
      if (animation.getState() === 'init') animation.tick(0)
      if (animation.getState() === 'pending') {
        animation.tick((animation.getBeginStartedTime() ?? 0) + animation.getAnimationBegin())
      }
      animation.complete()
    }
    const id = animation.getAnimationId()
    if (introduced.has(id)) {
      // Enter the active state before completing so Recharts also clears its label suppression.
      complete()
      update(animation.getTo())
      return () => {}
    }

    let cancel: (() => void) | undefined
    const advance = (now: number) => {
      const remaining = animation.tick(now)
      if (animation.getState() === 'active') {
        introduced.add(id)
        if (introduced.size > 128) introduced.delete(introduced.values().next().value!)
        update(animation.getInterpolated())
        if (animation.getProgress() === 1) {
          animation.complete()
          cancel = undefined
          return
        }
      }
      cancel = clock.setTimeout(advance, remaining)
    }
    cancel = clock.setTimeout(advance, 0)
    return () => {
      cancel?.()
      complete()
    }
  }
}
