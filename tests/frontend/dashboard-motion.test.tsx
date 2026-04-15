// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartCard, useChartAnimationState } from '@/components/charts/ChartCard'
import {
  AnimatedDashboardSection,
  useDashboardSectionMotion,
} from '@/components/dashboard/dashboard-motion'
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

  it('preloads before reveal and only activates chart animation once visible', () => {
    render(
      <AnimatedDashboardSection id="demo" placeholderClassName="min-h-[120px]">
        <ChartCard title="Demo chart">
          <MotionProbe />
        </ChartCard>
      </AnimatedDashboardSection>,
    )

    expect(screen.queryByTestId('section-visible')).not.toBeInTheDocument()

    act(() => {
      MockIntersectionObserver.instances[0]?.trigger(true)
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('false')
    expect(screen.getByTestId('chart-active')).toHaveTextContent('false')
    expect(screen.getByTestId('chart-delay')).toHaveTextContent('120')

    act(() => {
      MockIntersectionObserver.instances[1]?.trigger(true)
    })

    expect(screen.getByTestId('section-visible')).toHaveTextContent('true')
    expect(screen.getByTestId('chart-active')).toHaveTextContent('true')
  })
})
