// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { ChartReveal } from '@/components/charts/ChartCard'

describe('motion accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion)',
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })),
    )
  })

  it('renders FadeIn content without transform styles when reduced motion is requested', () => {
    render(
      <FadeIn>
        <div data-testid="fade-content">Content</div>
      </FadeIn>,
    )

    const wrapper = screen.getByTestId('fade-content').parentElement
    expect(wrapper?.getAttribute('style')).toBeNull()
  })

  it('renders chart reveal content without motion styles when reduced motion is requested', () => {
    render(
      <ChartReveal>
        <div data-testid="chart-content">Chart</div>
      </ChartReveal>,
    )

    const wrapper = screen.getByTestId('chart-content').parentElement
    expect(wrapper?.style.transform).toBe('')
    expect(wrapper?.style.opacity).toBe('')
  })
})
