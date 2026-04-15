// @vitest-environment jsdom

import { useRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartCard, useChartAnimationState } from '@/components/charts/ChartCard'
import {
  AnimatedDashboardSection,
  DashboardMotionItem,
  useDashboardElementMotion,
  useDashboardSectionMotion,
} from '@/components/dashboard/DashboardMotion'
import { initI18n } from '@/lib/i18n'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
  observedTargets = new Set<Element>()

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.observedTargets.add(target)
  }

  unobserve() {}

  disconnect() {}

  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          target: document.createElement('div'),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }
}

function getObserver(predicate: (observer: MockIntersectionObserver) => boolean) {
  const observer = MockIntersectionObserver.instances.find(predicate)
  expect(observer).toBeDefined()
  return observer!
}

function getObservers(predicate: (observer: MockIntersectionObserver) => boolean) {
  return MockIntersectionObserver.instances.filter(predicate)
}

function MotionProbe() {
  const motion = useDashboardSectionMotion()
  const chartMotion = useChartAnimationState()

  return (
    <>
      <div data-testid="section-visible">{String(motion?.sectionVisible)}</div>
      <div data-testid="chart-delay">{String(motion?.chartStartDelayMs)}</div>
      <div data-testid="chart-active">{String(chartMotion.active)}</div>
    </>
  )
}

function ItemMotionProbe() {
  const itemRef = useRef<HTMLDivElement | null>(null)
  const itemMotion = useDashboardElementMotion(itemRef)

  return (
    <div ref={itemRef} data-testid="item-active">
      {String(itemMotion.active)}
    </div>
  )
}

describe('AnimatedDashboardSection', () => {
  beforeEach(async () => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await initI18n('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preloads before reveal and only activates chart animation once visible', async () => {
    let resolvePreload: (() => void) | null = null
    const preloadPromise = new Promise<void>((resolve) => {
      resolvePreload = resolve
    })
    const handlePreload = vi.fn(() => preloadPromise)

    render(
      <AnimatedDashboardSection
        id="demo"
        placeholderClassName="min-h-[120px]"
        onPreload={handlePreload}
      >
        <ChartCard title="Demo chart">
          <MotionProbe />
        </ChartCard>
      </AnimatedDashboardSection>,
    )

    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    act(() => {
      getObserver((observer) => observer.options?.rootMargin === '0px 0px 45% 0px').trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(handlePreload).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    act(() => {
      getObserver((observer) => observer.options?.threshold === 0.14).trigger(true)
    })

    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    await act(async () => {
      resolvePreload?.()
      await preloadPromise
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
    expect(screen.getByTestId('chart-active')).toHaveTextContent('false')

    act(() => {
      getObservers(
        (observer) =>
          observer.options?.rootMargin !== '0px 0px 45% 0px' &&
          observer.options?.threshold !== 0.14,
      ).forEach((observer) => observer.trigger(true))
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
    expect(screen.getByTestId('chart-active')).toHaveTextContent('true')
    expect(screen.getByTestId('chart-delay')).toHaveTextContent('285')
  })

  it('keeps preloaded hidden content inert until the section is revealed', async () => {
    render(
      <AnimatedDashboardSection
        id="demo"
        placeholderClassName="min-h-[120px]"
        onPreload={() => Promise.resolve()}
      >
        <ChartCard title="Demo chart">
          <div>Chart body</div>
        </ChartCard>
      </AnimatedDashboardSection>,
    )

    act(() => {
      getObserver((observer) => observer.options?.rootMargin === '0px 0px 45% 0px').trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const inertContainer = document.querySelector('[inert]')
    const button = screen.getByRole('button', { name: 'Demo chart expand' })

    expect(inertContainer).toHaveAttribute('inert')
    expect(button).toHaveAttribute('tabindex', '-1')

    act(() => {
      getObserver((observer) => observer.options?.threshold === 0.14).trigger(true)
    })

    expect(document.querySelector('[data-section-visible="true"]')).toBeInTheDocument()
    expect(button).not.toHaveAttribute('tabindex', '-1')
  })

  it('still prepares and reveals content when onPreload throws synchronously', async () => {
    render(
      <AnimatedDashboardSection
        id="demo"
        onPreload={() => {
          throw new Error('sync preload failure')
        }}
      >
        <ChartCard title="Demo chart">
          <MotionProbe />
        </ChartCard>
      </AnimatedDashboardSection>,
    )

    act(() => {
      getObserver((observer) => observer.options?.rootMargin === '0px 0px 45% 0px').trigger(true)
      getObserver((observer) => observer.options?.threshold === 0.14).trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
  })

  it('treats item motion as active when IntersectionObserver is unavailable', async () => {
    vi.unstubAllGlobals()

    render(
      <AnimatedDashboardSection id="demo" eager>
        <ItemMotionProbe />
      </AnimatedDashboardSection>,
    )

    expect(screen.getByTestId('item-active')).toHaveTextContent('true')
  })

  it('keeps hidden dashboard items non-interactive until they reveal', () => {
    render(
      <AnimatedDashboardSection id="demo" eager>
        <DashboardMotionItem data-testid="item-wrapper">
          <button type="button">Item action</button>
        </DashboardMotionItem>
      </AnimatedDashboardSection>,
    )

    const wrapper = screen.getByTestId('item-wrapper')
    const button = screen.getByRole('button', { name: 'Item action', hidden: true })

    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper).toHaveStyle({ pointerEvents: 'none' })
    expect(button).toHaveAttribute('tabindex', '-1')

    act(() => {
      getObservers((observer) => observer.options?.threshold === 0.24).forEach((observer) =>
        observer.trigger(true),
      )
    })

    expect(wrapper).toHaveAttribute('aria-hidden', 'false')
    expect(wrapper).not.toHaveStyle({ pointerEvents: 'none' })
    expect(button).not.toHaveAttribute('tabindex', '-1')
  })
})
