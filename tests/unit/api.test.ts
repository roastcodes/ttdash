import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteSettings,
  deleteUsage,
  fetchSettings,
  fetchToktrackVersionStatus,
  generatePdfReport,
  importSettings,
  importUsageData,
  loadBootstrapSettings,
  uploadData,
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

  it('returns bootstrap defaults without an error message when the settings request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(loadBootstrapSettings()).resolves.toEqual({
      settings: DEFAULT_APP_SETTINGS,
      errorMessage: null,
      loadedFromServer: false,
      fetchedAt: null,
    })
  })

  it('returns the upload summary when usage upload succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ days: 3, totalCost: 12.5 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(uploadData({ daily: [] })).resolves.toEqual({
      days: 3,
      totalCost: 12.5,
    })
  })

  it('uses the localized upload fallback when the server omits an upload error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(uploadData({ daily: [] })).rejects.toThrow('Upload failed')
  })

  it('uses the localized import fallback when importing usage data fails without a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(importUsageData({ daily: [] })).rejects.toThrow('Data import failed')
  })

  it('returns normalized defaults when deleting settings succeeds without a settings payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(deleteSettings()).resolves.toEqual(DEFAULT_APP_SETTINGS)
  })

  it('prefers the server-provided delete-settings message when resetting settings fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Reset denied' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(deleteSettings()).rejects.toThrow('Reset denied')
  })

  it('normalizes imported settings responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            language: 'en',
            theme: 'light',
            reducedMotionPreference: 'never',
            cliAutoLoadActive: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    await expect(importSettings({ settings: {} })).resolves.toMatchObject({
      language: 'en',
      theme: 'light',
      reducedMotionPreference: 'never',
      cliAutoLoadActive: true,
    })
  })

  it('loads the toktrack version status payload unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            configuredVersion: '2.5.0',
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
      configuredVersion: '2.5.0',
      latestVersion: '2.4.1',
      isLatest: false,
      lookupStatus: 'ok',
    })
  })

  it('uses the localized toktrack fallback when the version status fetch fails', async () => {
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

    await expect(fetchToktrackVersionStatus()).rejects.toThrow(
      'Fehler beim Laden des Toktrack-Versionsstatus',
    )
  })

  it('throws the localized delete fallback when deleting usage fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(deleteUsage()).rejects.toThrow('Delete failed')
  })

  it('returns the PDF blob when report generation succeeds', async () => {
    const blob = new Blob(['pdf-data'], { type: 'application/pdf' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    )

    await expect(
      generatePdfReport({
        viewMode: 'daily',
        selectedMonth: null,
        selectedProviders: [],
        selectedModels: [],
        language: 'en',
      }),
    ).resolves.toEqual(blob)
  })

  it('prefers the server-provided PDF error message over the localized fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Typst unavailable' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      generatePdfReport({
        viewMode: 'daily',
        selectedMonth: null,
        selectedProviders: [],
        selectedModels: [],
        language: 'en',
      }),
    ).rejects.toThrow('Typst unavailable')
  })
})
