// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartCard, useChartAnimationState } from '@/components/charts/ChartCard'
import {
  AnimatedDashboardSection,
  useDashboardSectionMotion,
} from '@/components/dashboard/DashboardMotion'
import { initI18n } from '@/lib/i18n'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe() {}

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
      MockIntersectionObserver.instances[0]?.trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(handlePreload).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    act(() => {
      MockIntersectionObserver.instances[1]?.trigger(true)
    })

    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    await act(async () => {
      resolvePreload?.()
      await preloadPromise
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
    expect(screen.getByTestId('chart-active')).toHaveTextContent('false')

    act(() => {
      MockIntersectionObserver.instances.slice(2).forEach((observer) => observer.trigger(true))
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
      MockIntersectionObserver.instances[0]?.trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const inertContainer = document.querySelector('[inert]')
    const button = screen.getByRole('button', { name: 'Demo chart expand' })

    expect(inertContainer).toHaveAttribute('inert')
    expect(button).toHaveAttribute('tabindex', '-1')

    act(() => {
      MockIntersectionObserver.instances[1]?.trigger(true)
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
      MockIntersectionObserver.instances[0]?.trigger(true)
      MockIntersectionObserver.instances[1]?.trigger(true)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
  })
})
