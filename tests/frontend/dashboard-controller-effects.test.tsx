// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import type { i18n as I18n } from 'i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDashboardControllerEffects } from '@/hooks/use-dashboard-controller-effects'

describe('useDashboardControllerEffects', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles rejected language changes without an unhandled promise rejection', async () => {
    const error = new Error('language pack missing')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const i18n = {
      resolvedLanguage: 'de',
      changeLanguage: vi.fn().mockRejectedValue(error),
    } as unknown as I18n

    renderHook(() =>
      useDashboardControllerEffects({
        theme: 'light',
        language: 'en',
        i18n,
        bootstrapSettingsError: null,
        hasFetchedAfterMount: false,
        settingsError: null,
        onClearBootstrapSettingsError: vi.fn(),
        onOpenSettings: vi.fn(),
      }),
    )

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Failed to change dashboard language', error),
    )
  })
})
