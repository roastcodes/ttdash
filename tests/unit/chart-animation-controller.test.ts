import { describe, expect, it, vi } from 'vitest'
import { JavascriptAnimation, type AnimationController } from 'recharts'
import { createChartAnimationController } from '@/components/charts/chart-animation-controller'

function createClock() {
  const callbacks = new Set<(now: number) => void>()
  return {
    setTimeout(callback: (now: number) => void) {
      callbacks.add(callback)
      return () => {
        callbacks.delete(callback)
      }
    },
    advance(now: number) {
      const pending = [...callbacks]
      callbacks.clear()
      pending.forEach((callback) => callback(now))
    },
    get pending() {
      return callbacks.size
    },
  }
}

function start(controller: AnimationController, clock: ReturnType<typeof createClock>, id: string) {
  const update = vi.fn()
  const onEnd = vi.fn()
  const animation = new JavascriptAnimation({
    animationId: id,
    animationDuration: 100,
    animationBegin: 20,
    from: 0,
    to: 1,
    easing: (progress) => progress,
    onAnimationStart: undefined,
    onAnimationEnd: onEnd,
  })
  const cancel = controller(clock, animation, update)
  return { update, onEnd, cancel, animation }
}

describe('chart visibility animation lifecycle', () => {
  it('finishes current and new hidden updates without scheduling another frame', () => {
    let visible = true
    const controller = createChartAnimationController({ canAnimate: () => visible })
    const clock = createClock()
    const first = start(controller, clock, 'first')
    clock.advance(0)
    clock.advance(45)
    visible = false
    controller.finish()
    expect(first.update).toHaveBeenLastCalledWith(1)
    expect(first.onEnd).toHaveBeenCalledOnce()
    expect(clock.pending).toBe(0)
    const hidden = start(controller, clock, 'hidden')
    expect(hidden.update).toHaveBeenCalledExactlyOnceWith(1)
    expect(clock.pending).toBe(0)
  })

  it('computes entrance geometry once for a shared mask, then interpolates new data', () => {
    const controller = createChartAnimationController({ instantEntrance: true })
    const clock = createClock()
    expect(start(controller, clock, 'first').update).toHaveBeenCalledExactlyOnceWith(1)
    expect(clock.pending).toBe(0)
    const update = start(controller, clock, 'changed')
    clock.advance(0)
    clock.advance(20)
    clock.advance(70)
    expect(update.update).toHaveBeenLastCalledWith(0.5)
  })

  it('animates new plot data and displays a completed plot immediately on returning to view', () => {
    const controller = createChartAnimationController()
    const clock = createClock()
    const first = start(controller, clock, 'series-a')
    clock.advance(0)
    clock.advance(20)
    clock.advance(70)
    expect(first.update).toHaveBeenLastCalledWith(0.5)
    clock.advance(120)
    expect(first.update).toHaveBeenLastCalledWith(1)
    expect(first.onEnd).toHaveBeenCalledOnce()
    first.cancel()
    const returning = start(controller, clock, 'series-a')
    expect(returning.update).toHaveBeenCalledExactlyOnceWith(1)
    expect(returning.onEnd).toHaveBeenCalledOnce()
    expect(clock.pending).toBe(0)
    start(controller, clock, 'series-b')
    expect(clock.pending).toBe(1)
  })

  it('cancels work when a plot leaves view and never restarts an interrupted entrance', () => {
    const controller = createChartAnimationController()
    const clock = createClock()
    const first = start(controller, clock, 'series-a')
    clock.advance(0)
    clock.advance(20)
    clock.advance(45)
    first.cancel()
    expect(clock.pending).toBe(0)
    expect(first.onEnd).toHaveBeenCalledOnce()
    const returning = start(controller, clock, 'series-a')
    expect(returning.update).toHaveBeenCalledExactlyOnceWith(1)
    expect(clock.pending).toBe(0)
  })

  it('clears Recharts animation state even when cancelled during its start delay', () => {
    const controller = createChartAnimationController()
    const clock = createClock()
    const first = start(controller, clock, 'series-a')
    clock.advance(0)
    first.cancel()
    expect(first.animation.getState()).toBe('completed')
    expect(first.onEnd).toHaveBeenCalledOnce()
    expect(clock.pending).toBe(0)
  })
})
