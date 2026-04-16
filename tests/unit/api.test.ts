import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchSettings,
  fetchToktrackVersionStatus,
  loadBootstrapSettings,
  updateSettings,
} from '@/lib/api'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'

describe('api error handling', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the localized fallback when settings fetch fails without a server message', async () => {
    await initI18n('de')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(fetchSettings()).rejects.toThrow('Fehler beim Laden der Einstellungen')
  })

  it('uses the localized fallback when saving settings fails without a server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(updateSettings({ theme: 'light' })).rejects.toThrow('Failed to save settings')
  })

  it('prefers the server-provided settings error message over the localized fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Settings file is unreadable or corrupted.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(fetchSettings()).rejects.toThrow('Settings file is unreadable or corrupted.')
  })

  it('falls back to the system motion preference for invalid settings API values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            language: 'en',
            reducedMotionPreference: 'invalid',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(fetchSettings()).resolves.toMatchObject({
      language: 'en',
      reducedMotionPreference: 'system',
      theme: 'dark',
    })
  })

  it('returns bootstrap defaults together with the localized error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(loadBootstrapSettings()).resolves.toEqual({
      settings: DEFAULT_APP_SETTINGS,
      errorMessage: 'Failed to load settings',
      loadedFromServer: false,
      fetchedAt: null,
    })
  })

  it('fills in the system motion preference when bootstrap settings omit the field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            language: 'en',
            theme: 'light',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(loadBootstrapSettings()).resolves.toMatchObject({
      settings: {
        language: 'en',
        theme: 'light',
        reducedMotionPreference: 'system',
      },
      errorMessage: null,
      loadedFromServer: true,
    })
  })

  it('loads the toktrack version status payload unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            configuredVersion: '2.4.0',
            latestVersion: '2.4.1',
            isLatest: false,
            lookupStatus: 'ok',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(fetchToktrackVersionStatus()).resolves.toEqual({
      configuredVersion: '2.4.0',
      latestVersion: '2.4.1',
      isLatest: false,
      lookupStatus: 'ok',
    })
  })
})
