// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { initI18n } from '@/lib/i18n'

function ToastHarness({ type = 'success' }: { type?: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast()

  return (
    <button type="button" onClick={() => addToast('Saved successfully', type)}>
      Trigger toast
    </button>
  )
}

describe('ToastProvider', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await initI18n('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces non-error toasts as status messages and allows explicit dismissal', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trigger toast' }))

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Saved successfully')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  }, 15_000)

  it('announces error toasts as alerts', () => {
    render(
      <ToastProvider>
        <ToastHarness type="error" />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trigger toast' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Saved successfully')
  }, 15_000)
})
