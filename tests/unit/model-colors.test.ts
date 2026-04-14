import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { getModelColor, getModelColorAlpha } from '@/lib/model-utils'

const require = createRequire(import.meta.url)
const { getModelColor: getSharedModelColor, getModelColorRgb } =
  require('../../shared/model-colors.js') as {
    getModelColor: (name: string, options?: { theme?: 'light' | 'dark'; alpha?: number }) => string
    getModelColorRgb: (
      name: string,
      options?: { theme?: 'light' | 'dark'; alpha?: number },
    ) => string
  }

const { getModelColor: getReportModelColor } = require('../../server/report/utils.js') as {
  getModelColor: (name: string) => string
}

describe('model colors', () => {
  it('assigns curated theme-aware colors to current model families', () => {
    expect(getModelColor('GPT-5.4', 'dark')).toBe('hsl(148, 72%, 57%)')
    expect(getModelColor('GPT-5.4', 'light')).toBe('hsl(148, 68%, 40%)')
    expect(getModelColor('Claude Sonnet 4.5', 'dark')).toBe('hsl(214, 66%, 52%)')
    expect(getModelColor('Claude Sonnet 4.5', 'light')).toBe('hsl(214, 60%, 36%)')
    expect(getModelColor('Gemini 2.5 Pro', 'dark')).toBe('hsl(40, 88%, 49%)')
    expect(getModelColor('Gemini 2.5 Pro', 'light')).toBe('hsl(38, 86%, 34%)')
  })

  it('keeps model families recognizable while separating versions', () => {
    expect(getModelColor('GPT-5.4', 'dark')).not.toBe(getModelColor('GPT-5', 'dark'))
    expect(getModelColor('GPT-5.4', 'light')).not.toBe(getModelColor('GPT-5', 'light'))
    expect(getModelColor('Claude Opus 4.6', 'dark')).not.toBe(
      getModelColor('Claude Opus 4.5', 'dark'),
    )
    expect(getModelColor('Gemini 3 Flash Preview', 'light')).not.toBe(
      getModelColor('Gemini 2.5 Pro', 'light'),
    )
  })

  it('maps prefixed and unprefixed Anthropic display names to the same curated color', () => {
    expect(getModelColor('Claude Sonnet 4.5', 'dark')).toBe(getModelColor('Sonnet 4.5', 'dark'))
    expect(getModelColor('Claude Opus 4.6', 'light')).toBe(getModelColor('Opus 4.6', 'light'))
  })

  it('returns deterministic fallback colors for unknown models and tunes them per theme', () => {
    const dark = getModelColor('Mystery Frontier Alpha', 'dark')
    const light = getModelColor('Mystery Frontier Alpha', 'light')

    expect(dark).toBe(getModelColor('Mystery Frontier Alpha', 'dark'))
    expect(light).toBe(getModelColor('Mystery Frontier Alpha', 'light'))
    expect(dark).not.toBe(light)
  })

  it('creates valid alpha variants for chip and bar backgrounds', () => {
    expect(getModelColorAlpha('GPT-5.4', 0.16, 'dark')).toBe('hsla(148, 72%, 57%, 0.16)')
    expect(getModelColorAlpha('Claude Sonnet 4.5', 0.16, 'light')).toBe('hsla(214, 60%, 36%, 0.16)')
  })

  it('uses the light palette consistently in report output', () => {
    expect(getReportModelColor('GPT-5.4')).toBe(getModelColorRgb('GPT-5.4', { theme: 'light' }))
    expect(getReportModelColor('Claude Sonnet 4.5')).toBe(
      getModelColorRgb('Claude Sonnet 4.5', { theme: 'light' }),
    )
  })

  it('shares the same underlying palette helpers between app and shared module', () => {
    expect(getModelColor('OpenCode', 'dark')).toBe(
      getSharedModelColor('OpenCode', { theme: 'dark' }),
    )
    expect(getModelColor('OpenCode', 'light')).toBe(
      getSharedModelColor('OpenCode', { theme: 'light' }),
    )
  })
})
