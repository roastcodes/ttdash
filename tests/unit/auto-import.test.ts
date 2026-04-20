import { afterEach, describe, expect, it, vi } from 'vitest'
import { startAutoImport, translateAutoImportEvent } from '@/lib/auto-import'

const translations = {
  'autoImportModal.startingLocalImport': 'Starte toktrack-Import...',
  'autoImportModal.warmingUpPackageRunner':
    'Bereite {{runner}} vor (beim ersten Start kann das Herunterladen von toktrack länger dauern)...',
  'autoImportModal.loadingUsageData': 'Lade Nutzungsdaten via {{command}}...',
  'autoImportModal.processingUsageData': 'Verarbeite Nutzungsdaten... ({{seconds}}s)',
  'autoImportModal.autoImportRunning': 'Ein Auto-Import läuft bereits. Bitte warten.',
  'autoImportModal.noRunnerFound': 'Kein lokales toktrack, Bun oder npm exec gefunden.',
  'autoImportModal.localToktrackVersionMismatch':
    'Lokales toktrack v{{detectedVersion}} passt nicht zur erwarteten v{{expectedVersion}}.',
  'autoImportModal.localToktrackFailed':
    'Lokales toktrack konnte nicht gestartet werden: {{message}}',
  'autoImportModal.packageRunnerFailed':
    'Kein kompatibler bunx- oder npm-exec-Runner war erfolgreich: {{message}}',
  'autoImportModal.packageRunnerWarmupTimedOut':
    '{{runner}} brauchte länger als {{seconds}}s, um toktrack vorzubereiten. Beim ersten Start muss das Paket eventuell zuerst heruntergeladen werden. Bitte versuche es erneut oder prüfe den Netzwerkzugriff.',
  'autoImportModal.toktrackVersionCheckFailed':
    'toktrack wurde gefunden, aber die Versionsprüfung ist fehlgeschlagen: {{message}}',
  'autoImportModal.toktrackExecutionFailed':
    'toktrack ist beim Laden der Nutzungsdaten fehlgeschlagen: {{message}}',
  'autoImportModal.toktrackExecutionTimedOut':
    'toktrack hat das Laden der Nutzungsdaten via {{runner}} nicht innerhalb von {{seconds}}s abgeschlossen. Bitte versuche es erneut.',
  'autoImportModal.toktrackInvalidJson': 'toktrack hat ungültiges JSON zurückgegeben: {{message}}',
  'autoImportModal.toktrackInvalidData':
    'toktrack hat Daten geliefert, die TTDash nicht verarbeiten konnte: {{message}}',
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
      'Starte toktrack-Import...',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'warmingUpPackageRunner',
          vars: { runner: 'npm exec' },
        },
        translate,
      ),
    ).toBe(
      'Bereite npm exec vor (beim ersten Start kann das Herunterladen von toktrack länger dauern)...',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'loadingUsageData',
          vars: { command: 'npx --yes toktrack@2.5.0 daily --json' },
        },
        translate,
      ),
    ).toBe('Lade Nutzungsdaten via npx --yes toktrack@2.5.0 daily --json...')
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
          key: 'packageRunnerWarmupTimedOut',
          vars: { runner: 'bunx', seconds: 45 },
        },
        translate,
      ),
    ).toBe(
      'bunx brauchte länger als 45s, um toktrack vorzubereiten. Beim ersten Start muss das Paket eventuell zuerst heruntergeladen werden. Bitte versuche es erneut oder prüfe den Netzwerkzugriff.',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'toktrackExecutionTimedOut',
          vars: { runner: 'npm exec', seconds: 60 },
        },
        translate,
      ),
    ).toBe(
      'toktrack hat das Laden der Nutzungsdaten via npm exec nicht innerhalb von 60s abgeschlossen. Bitte versuche es erneut.',
    )
    expect(
      translateAutoImportEvent(
        {
          key: 'toktrackInvalidJson',
          vars: { message: 'Unexpected end of JSON input' },
        },
        translate,
      ),
    ).toBe('toktrack hat ungültiges JSON zurückgegeben: Unexpected end of JSON input')
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
      message: 'Starte toktrack-Import...',
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

  it('flushes the decoder tail so the final streamed event is not dropped', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: success\ndata: {"days":7,'))
        controller.enqueue(encoder.encode('"totalCost":12.5}\n\nevent: done\ndata: {}\n\n'))
        controller.close()
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
        }),
      ),
    )

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

    expect(callbacks.onSuccess).toHaveBeenCalledWith({ days: 7, totalCost: 12.5 })
    expect(callbacks.onError).not.toHaveBeenCalled()
  })

  it('treats an unexpected EOF without a terminal done frame as a lost server connection', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(['event: success', 'data: {"days":7,"totalCost":12.5}', ''].join('\n')),
        )
        controller.close()
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
        }),
      ),
    )

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

    expect(callbacks.onSuccess).toHaveBeenCalledWith({ days: 7, totalCost: 12.5 })
    expect(callbacks.onError).toHaveBeenCalledWith({
      message: 'autoImportModal.serverConnectionLost',
    })
  })
})
