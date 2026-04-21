// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartReveal } from '@/components/charts/ChartCard'
import { FadeIn } from '@/components/ui/fade-in'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { initI18n } from '@/lib/i18n'
import { AppMotionProvider, useShouldReduceMotion } from '@/lib/motion'

function installMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)'
          ? reduced
          : query === '(prefers-reduced-motion: no-preference)'
            ? !reduced
            : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  )
}

function renderWithMotionPreference(
  ui: ReactNode,
  preference: 'system' | 'always' | 'never' = 'system',
) {
  return render(<AppMotionProvider preference={preference}>{ui}</AppMotionProvider>)
}

function MotionProbe() {
  const shouldReduceMotion = useShouldReduceMotion()
  return <div data-testid="motion-probe">{shouldReduceMotion ? 'reduce' : 'full'}</div>
}

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

    await initI18n('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the browser preference when the app setting stays on system', () => {
    installMatchMedia(true)

    renderWithMotionPreference(
      <>
        <MotionProbe />
        <FadeIn>
          <div data-testid="fade-content">Content</div>
        </FadeIn>
        <Dialog open={true}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Motion dialog</DialogTitle>
            Content
          </DialogContent>
        </Dialog>
      </>,
    )

    const dialog = screen.getByRole('dialog')

    expect(screen.getByTestId('motion-probe')).toHaveTextContent('reduce')
    expect(screen.getByTestId('fade-content').parentElement).not.toHaveAttribute('style')
    expect(dialog).not.toHaveClass('data-[state=open]:animate-in')
    expect(dialog).not.toHaveClass('data-[state=open]:zoom-in-95')
  })

  it('does not subscribe to browser motion changes when the override is forced', () => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))

    vi.stubGlobal('matchMedia', matchMedia)

    renderWithMotionPreference(<MotionProbe />, 'always')

    expect(screen.getByTestId('motion-probe')).toHaveTextContent('reduce')
    expect(matchMedia).not.toHaveBeenCalled()
  })

  it('forces reduced motion across dashboard and app ui when the override is always', () => {
    installMatchMedia(false)

    function ToastHarness() {
      const { addToast } = useToast()

      useEffect(() => {
        addToast('Saved', 'success')
      }, [addToast])

      return null
    }

    renderWithMotionPreference(
      <>
        <MotionProbe />
        <ChartReveal>
          <div data-testid="chart-content">Chart</div>
        </ChartReveal>
        <ToastProvider>
          <ToastHarness />
        </ToastProvider>
      </>,
      'always',
    )

    expect(screen.getByTestId('motion-probe')).toHaveTextContent('reduce')
    expect(screen.getByTestId('chart-content').parentElement?.style.width).toBe('100%')
    expect(screen.getByTestId('chart-content').parentElement?.style.height).toBe('100%')
    expect(screen.getByRole('status')).not.toHaveClass('animate-in')
    expect(screen.getByRole('status')).not.toHaveClass('slide-in-from-bottom-2')
  })

  it('forces animated motion even when the browser requests reduced motion', () => {
    installMatchMedia(true)

    renderWithMotionPreference(
      <>
        <MotionProbe />
        <ChartReveal>
          <div data-testid="chart-content">Chart</div>
        </ChartReveal>
        <Dialog open={true}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Motion dialog</DialogTitle>
            Content
          </DialogContent>
        </Dialog>
      </>,
      'never',
    )

    const dialog = screen.getByRole('dialog')

    expect(screen.getByTestId('motion-probe')).toHaveTextContent('full')
    expect(screen.getByTestId('chart-content').parentElement?.style.width).toBe('')
    expect(screen.getByTestId('chart-content').parentElement?.parentElement?.style.width).toBe(
      '100%',
    )
    expect(dialog).toHaveClass('data-[state=open]:animate-in')
    expect(dialog).toHaveClass('data-[state=open]:zoom-in-95')
  })
})
