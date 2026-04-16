// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmptyState } from '@/components/EmptyState'
import { TOKTRACK_PACKAGE_SPEC } from '@/lib/toktrack-version'
import { initI18n } from '@/lib/i18n'

describe('EmptyState', () => {
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

  it('renders auto-import command examples from the shared toktrack package spec', () => {
    render(<EmptyState onUpload={vi.fn()} onAutoImport={vi.fn()} onOpenSettings={vi.fn()} />)

    expect(
      screen.getByText(new RegExp(`bunx ${TOKTRACK_PACKAGE_SPEC} daily --json`)),
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`npx --yes ${TOKTRACK_PACKAGE_SPEC} daily --json`)),
    ).toBeInTheDocument()
  })
})
