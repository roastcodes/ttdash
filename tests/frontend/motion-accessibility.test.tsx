// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { ChartReveal } from '@/components/charts/ChartCard'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { initI18n } from '@/lib/i18n'

describe('motion accessibility', () => {
  beforeEach(async () => {
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

    await initI18n('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('removes dialog animation classes when reduced motion is requested', () => {
    render(
      <Dialog open={true}>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole('dialog').className).not.toContain('animate-in')
    expect(screen.getByRole('dialog').className).not.toContain('zoom-in-95')
  })

  it('renders toast feedback without entrance animation classes when reduced motion is requested', () => {
    function ToastHarness() {
      const { addToast } = useToast()

      useEffect(() => {
        addToast('Saved', 'success')
      }, [addToast])

      return null
    }

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    expect(screen.getByRole('status').className).not.toContain('animate-in')
    expect(screen.getByRole('status').className).not.toContain('slide-in-from-bottom-2')
  })
})
