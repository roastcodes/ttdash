// @vitest-environment jsdom

import { useRef } from 'react'
import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardElementMotion } from '@/components/dashboard/DashboardMotion'
import { initI18n } from '@/lib/i18n'
import { renderWithAppProviders } from '../test-utils'

let notify: IntersectionObserverCallback
const disconnect = vi.fn()
const observe = vi.fn()

function Probe({ parent = false }: { parent?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const visibility = useDashboardElementMotion(ref, { observeParent: parent })
  return (
    <div data-testid="parent">
      <div ref={ref} data-testid="probe">
        {JSON.stringify(visibility)}
      </div>
    </div>
  )
}

function intersect(visible: boolean) {
  act(() =>
    notify([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver),
  )
}

function state() {
  return JSON.parse(screen.getByTestId('probe').textContent!)
}

describe('live dashboard motion visibility', () => {
  beforeEach(async () => {
    await initI18n('en')
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback
        }
        observe = observe
        disconnect = disconnect
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('stops offscreen motion and preserves its first reveal when scrolling back', () => {
    const { unmount } = renderWithAppProviders(<Probe />, { motionPreference: 'never' })
    expect(state()).toMatchObject({ canAnimate: false, hasRevealed: false, runKey: 0 })
    intersect(true)
    expect(state()).toMatchObject({ canAnimate: true, hasRevealed: true, runKey: 1 })
    intersect(false)
    expect(state()).toMatchObject({ canAnimate: false, hasRevealed: true, runKey: 1 })
    intersect(true)
    expect(state()).toMatchObject({ canAnimate: true, hasRevealed: true, runKey: 1 })
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('pauses visible motion while the browser document is hidden', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('visible')
    renderWithAppProviders(<Probe />, { motionPreference: 'never' })
    intersect(true)
    act(() => {
      visibility.mockReturnValue('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(state()).toMatchObject({ canAnimate: false, hasRevealed: true, runKey: 1 })
    act(() => {
      visibility.mockReturnValue('visible')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(state()).toMatchObject({ canAnimate: true, runKey: 1 })
  })

  it('observes the meter track so a zero-width fill can become visible', () => {
    renderWithAppProviders(<Probe parent />, { motionPreference: 'never' })
    expect(observe).toHaveBeenCalledWith(screen.getByTestId('parent'))
    intersect(true)
    expect(state().canAnimate).toBe(true)
  })

  it('shows static content without IntersectionObserver and honors reduced motion', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { unmount } = renderWithAppProviders(<Probe />, { motionPreference: 'never' })
    expect(state()).toMatchObject({ hasRevealed: true, canAnimate: false })
    unmount()
    renderWithAppProviders(<Probe />, { motionPreference: 'always' })
    expect(state()).toMatchObject({ hasRevealed: true, canAnimate: false })
  })
})
