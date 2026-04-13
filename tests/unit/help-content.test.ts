import { beforeAll, describe, expect, it } from 'vitest'
import { CHART_HELP, FEATURE_HELP, SECTION_HELP } from '@/lib/help-content'
import { initI18n } from '@/lib/i18n'

describe('help-content proxy semantics', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('only reports own property descriptors for existing help entries', () => {
    expect(Object.prototype.hasOwnProperty.call(CHART_HELP, 'costOverTime')).toBe(true)
    expect(Object.getOwnPropertyDescriptor(CHART_HELP, 'costOverTime')).toMatchObject({
      enumerable: true,
      configurable: true,
    })

    expect(Object.prototype.hasOwnProperty.call(CHART_HELP, 'missingHelpKey')).toBe(false)
    expect(Object.getOwnPropertyDescriptor(CHART_HELP, 'missingHelpKey')).toBeUndefined()
  })

  it('does not expose prototype properties as help keys', () => {
    expect('toString' in CHART_HELP).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(CHART_HELP, 'toString')).toBe(false)
    expect(CHART_HELP.toString).toBeUndefined()
  })

  it('keeps German help copy free of mixed request and subscription terminology', async () => {
    await initI18n('de')

    expect(CHART_HELP.requestsOverTime).toContain('Anfragen')
    expect(CHART_HELP.requestsOverTime).not.toContain('Requests')
    expect(CHART_HELP.distributionAnalysis).toContain('Tokens pro Anfrage')
    expect(CHART_HELP.distributionAnalysis).not.toContain('Request')
    expect(CHART_HELP.providerSubscriptionMix).toContain('Abo-Kosten')
    expect(CHART_HELP.providerSubscriptionMix).not.toContain('Subscription')

    expect(SECTION_HELP.forecastCache).toContain('Anfragequalität')
    expect(SECTION_HELP.limits).toContain('Abos')
    expect(SECTION_HELP.requestAnalysis).toContain('Anfragen')
    expect(SECTION_HELP.tables).toContain('Anbieter')

    expect(FEATURE_HELP.requestQuality).toContain('Anfragesignale')
    expect(FEATURE_HELP.requestQuality).not.toContain('Request')
    expect(FEATURE_HELP.providerEfficiency).toContain('Kosten pro Anfrage')
    expect(FEATURE_HELP.providerEfficiency).not.toContain('$/Req')
  })
})
