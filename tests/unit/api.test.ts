import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSettings, updateSettings } from '@/lib/api'
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
    await initI18n('en')
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
})
