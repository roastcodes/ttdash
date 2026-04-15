import { describe, expect, it } from 'vitest'
import i18n, { initI18n } from '@/lib/i18n'
import { formatDate } from '@/lib/formatters'

describe('insights localization', () => {
  it('does not render duplicate punctuation in the german peak-window summary', async () => {
    await initI18n('de')

    const summary = i18n.t('insights.peakWindow.summary', {
      start: formatDate('2026-04-05'),
      end: formatDate('2026-04-11'),
    })

    expect(summary).not.toContain('..')
    expect(summary).toBe('Stärkste 7-Tage-Phase von 05.04. bis 11.04.')
  })
})
