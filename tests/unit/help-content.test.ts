import { beforeAll, describe, expect, it } from 'vitest'
import { CHART_HELP } from '@/lib/help-content'
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
})
