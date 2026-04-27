// @vitest-environment jsdom

import { act, fireEvent, screen } from '@testing-library/react'
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

  it('groups filter controls by intent and localizes the group labels', async () => {
    const currentLanguage = document.documentElement.lang

    try {
      const { unmount } = renderFilterBar()

      expect(screen.getByRole('region', { name: 'Time' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Date range' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Providers' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Models' })).toBeInTheDocument()

      unmount()
      await initI18n('de')
      renderFilterBar()

      expect(screen.getByRole('region', { name: 'Zeit' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Zeitraum' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Anbieter' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Modelle' })).toBeInTheDocument()
    } finally {
      await initI18n(currentLanguage || 'en')
    }
  })

  it('updates open date picker calendar labels after a runtime language change', async () => {
    const currentLanguage = document.documentElement.lang

    try {
      await initI18n('en')
      vi.setSystemTime(new Date('2026-03-06T12:00:00Z'))
      renderFilterBar()

      fireEvent.click(screen.getByRole('button', { name: 'Start date' }))
      expect(screen.getByText('March 2026')).toBeInTheDocument()
      expect(screen.getByText('Tu')).toBeInTheDocument()

      await act(async () => {
        await initI18n('de')
      })

      expect(screen.getByText('März 2026')).toBeInTheDocument()
      expect(screen.getByText('Di')).toBeInTheDocument()
    } finally {
      await initI18n(currentLanguage || 'en')
    }
  })
})
