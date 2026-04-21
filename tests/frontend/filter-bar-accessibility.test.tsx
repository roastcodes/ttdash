// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { renderFilterBar } from './filter-bar-test-helpers'

describe('FilterBar accessibility', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('localizes the calendar month navigation aria labels', async () => {
    const currentLanguage = document.documentElement.lang

    try {
      await initI18n('de')
      renderFilterBar()

      fireEvent.click(screen.getByRole('button', { name: 'Startdatum' }))
      expect(screen.getByRole('button', { name: 'Vorheriger Monat' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeInTheDocument()
    } finally {
      await initI18n(currentLanguage || 'en')
    }
  })

  it('exposes accessible names for the top-level filter comboboxes', () => {
    renderFilterBar()

    expect(screen.getByRole('combobox', { name: 'View mode' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Focus month' })).toBeInTheDocument()
  })
})
