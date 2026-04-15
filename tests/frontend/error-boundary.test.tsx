// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/components/ui/error-boundary'

function ThrowingChild() {
  throw new Error('render boom')
}

describe('ErrorBoundary', () => {
  it('renders the fallback when a child throws during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary fallback={<div>Section unavailable</div>}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Section unavailable')).toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalled()
  })
})
