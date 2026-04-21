import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { getLanguage, getLocale, translate } = require('../../server/report/i18n.js') as {
  getLanguage: (language: string) => 'de' | 'en'
  getLocale: (language: string) => string
  translate: (language: string, key: string, vars?: Record<string, string>) => string
}

describe('report i18n shared resources', () => {
  it('resolves locales for supported languages and falls back to default language and locale for unsupported inputs', () => {
    expect(getLanguage('en')).toBe('en')
    expect(getLocale('en')).toBe('en-US')

    // Unsupported languages should use the default German report language and locale.
    expect(getLanguage('fr')).toBe('de')
    expect(getLocale('fr')).toBe('de-CH')
    expect(getLanguage('xx')).toBe('de')
    expect(getLocale('xx')).toBe('de-CH')
  })

  it('translates report keys from the shared locale bundles', () => {
    expect(translate('en', 'header.loaded')).toBe('Loaded')
    expect(translate('de', 'header.loaded')).toBe('Geladen')
    expect(translate('fr', 'common.close')).toBe('Schliessen')
  })

  it('interpolates variables and falls back to the key when unknown', () => {
    expect(translate('en', 'header.versionLinkTitle', { version: '6.2.6' })).toContain('6.2.6')
    expect(translate('en', 'missing.section.key')).toBe('missing.section.key')
  })
})
