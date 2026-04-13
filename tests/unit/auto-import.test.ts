import { afterEach, describe, expect, it, vi } from 'vitest'
import { startAutoImport, translateAutoImportEvent } from '@/lib/auto-import'

const translations = {
  'autoImportModal.startingLocalImport': 'Starte lokalen toktrack-Import...',
  'autoImportModal.loadingUsageData': 'Lade Nutzungsdaten via {{command}}...',
  'autoImportModal.processingUsageData': 'Verarbeite Nutzungsdaten... ({{seconds}}s)',
  'autoImportModal.autoImportRunning': 'Ein Auto-Import läuft bereits. Bitte warten.',
  'autoImportModal.noRunnerFound': 'Kein lokales toktrack, Bun oder npm exec gefunden.',
  'autoImportModal.errorPrefix': 'Fehler: {{message}}',
} as const

function translate(key: string, vars?: Record<string, string | number>) {
  let template = translations[key as keyof typeof translations] ?? key

  for (const [name, value] of Object.entries(vars ?? {})) {
    template = template.replace(`{{${name}}}`, String(value))
  }

  return template
}

describe('translateAutoImportEvent', () => {
  it('renders structured progress events via translation keys instead of source-text matching', () => {
    expect(translateAutoImportEvent({ key: 'startingLocalImport' }, translate)).toBe(
      'Starte lokalen toktrack-Import...',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'loadingUsageData',
          vars: { command: 'npx --yes toktrack daily --json' },
        },
        translate,
      ),
    ).toBe('Lade Nutzungsdaten via npx --yes toktrack daily --json...')
    expect(
      translateAutoImportEvent(
        {
          key: 'processingUsageData',
          vars: { seconds: 10 },
        },
        translate,
      ),
    ).toBe('Verarbeite Nutzungsdaten... (10s)')
  })

  it('renders localized error events from structured payloads', () => {
    expect(translateAutoImportEvent({ key: 'noRunnerFound' }, translate)).toBe(
      'Kein lokales toktrack, Bun oder npm exec gefunden.',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'errorPrefix',
          vars: { message: 'toktrack failed' },
        },
        translate,
      ),
    ).toBe('Fehler: toktrack failed')
  })
})

describe('startAutoImport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts auto-import via POST and dispatches streamed events', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'event: check',
              'data: {"tool":"toktrack","status":"checking"}',
              '',
              'event: progress',
              'data: {"key":"startingLocalImport","vars":{}}',
              '',
              'event: stderr',
              'data: {"line":"runner output"}',
              '',
              'event: success',
              'data: {"days":3,"totalCost":4.5}',
              '',
              'event: done',
              'data: {}',
              '',
            ].join('\n'),
          ),
        )
        controller.close()
      },
    })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const callbacks = {
      onCheck: vi.fn(),
      onProgress: vi.fn(),
      onStderr: vi.fn(),
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onDone: vi.fn(),
    }

    startAutoImport(callbacks, translate)

    await vi.waitFor(() => {
      expect(callbacks.onDone).toHaveBeenCalledTimes(1)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auto-import/stream',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(callbacks.onCheck).toHaveBeenCalledWith({
      tool: 'toktrack',
      status: 'checking',
    })
    expect(callbacks.onProgress).toHaveBeenCalledWith({
      key: 'startingLocalImport',
      vars: {},
      message: 'Starte lokalen toktrack-Import...',
    })
    expect(callbacks.onStderr).toHaveBeenCalledWith({ line: 'runner output' })
    expect(callbacks.onSuccess).toHaveBeenCalledWith({ days: 3, totalCost: 4.5 })
    expect(callbacks.onError).not.toHaveBeenCalled()
  })

  it('surfaces structured server errors when the POST request is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Cross-site requests are not allowed' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const callbacks = {
      onCheck: vi.fn(),
      onProgress: vi.fn(),
      onStderr: vi.fn(),
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onDone: vi.fn(),
    }

    startAutoImport(callbacks, translate)

    await vi.waitFor(() => {
      expect(callbacks.onDone).toHaveBeenCalledTimes(1)
    })

    expect(callbacks.onError).toHaveBeenCalledWith({
      message: 'Cross-site requests are not allowed',
    })
    expect(callbacks.onSuccess).not.toHaveBeenCalled()
  })
})
