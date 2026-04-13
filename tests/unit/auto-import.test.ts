import { describe, expect, it } from 'vitest'
import { translateAutoImportEvent } from '@/lib/auto-import'

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
