// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import { renderSettingsModal, stubToktrackVersionStatus } from './settings-modal-test-helpers'

describe('SettingsModal default filters', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('keeps selected default providers and models visible even when they are missing from the active filters', () => {
    renderSettingsModal({
      filterProviders: ['OpenAI'],
      models: ['gpt-4o'],
      defaultFilters: {
        ...DEFAULT_APP_SETTINGS.defaultFilters,
        providers: ['Legacy'],
        models: ['legacy-model'],
      },
    })

    const defaultsSection = screen.getByTestId('settings-defaults-section')

    expect(within(defaultsSection).getByRole('button', { name: 'Legacy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(defaultsSection).getByRole('button', { name: 'legacy-model' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('resets the default filter draft back to the shared defaults before saving', () => {
    const { onSaveSettings } = renderSettingsModal({
      filterProviders: ['Anthropic', 'OpenAI'],
      models: ['claude-3-7-sonnet', 'gpt-4o'],
      defaultFilters: {
        ...DEFAULT_APP_SETTINGS.defaultFilters,
        viewMode: 'monthly',
        datePreset: 'year',
        providers: ['Anthropic'],
        models: ['claude-3-7-sonnet'],
      },
    })

    const defaultsSection = screen.getByTestId('settings-defaults-section')

    fireEvent.click(screen.getByTestId('settings-default-view-mode-daily'))
    fireEvent.click(screen.getByTestId('settings-default-date-preset-30d'))
    fireEvent.click(within(defaultsSection).getByRole('button', { name: 'OpenAI' }))
    fireEvent.click(within(defaultsSection).getByRole('button', { name: 'gpt-4o' }))
    fireEvent.click(screen.getByTestId('reset-default-filters'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultFilters: DEFAULT_APP_SETTINGS.defaultFilters,
      }),
    )
  })
})
