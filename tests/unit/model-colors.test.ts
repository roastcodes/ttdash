import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'
import { getModelColor, getModelColorAlpha } from '@/lib/model-utils'

const require = createRequire(import.meta.url)
const {
  getModelColor: getSharedModelColor,
  getModelColorRgb,
  getModelColorSpec,
} = require('../../shared/model-colors.js') as {
  getModelColor: (name: string, options?: { theme?: 'light' | 'dark'; alpha?: number }) => string
  getModelColorRgb: (name: string, options?: { theme?: 'light' | 'dark'; alpha?: number }) => string
  getModelColorSpec: (
    name: string,
    options?: { theme?: 'light' | 'dark'; alpha?: number },
  ) => { h: number; s: number; l: number }
}

const { getModelColor: getReportModelColor } = require('../../server/report/utils.js') as {
  getModelColor: (name: string) => string
}

describe('model colors', () => {
  function setDocumentTheme(isDark: boolean) {
    ;(
      globalThis as {
        document?: { documentElement: { classList: { contains: (name: string) => boolean } } }
      }
    ).document = {
      documentElement: {
        classList: {
          contains: (name: string) => name === 'dark' && isDark,
        },
      },
    }
  }

  afterEach(() => {
    delete (globalThis as { document?: unknown }).document
  })

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

  it('does not expose mutable shared color specs for curated models', () => {
    const spec = getModelColorSpec('GPT-5.4', { theme: 'dark' })
    spec.h = 0
    spec.s = 0
    spec.l = 0

    expect(getModelColorSpec('GPT-5.4', { theme: 'dark' })).toEqual({
      h: 148,
      s: 72,
      l: 57,
    })
  })

  it('uses the dark palette when no theme is passed and the document is dark', () => {
    setDocumentTheme(true)

    expect(getModelColor('GPT-5.4')).toBe(getModelColor('GPT-5.4', 'dark'))
    expect(getModelColor('Mystery Frontier Alpha')).toBe(
      getModelColor('Mystery Frontier Alpha', 'dark'),
    )
  })

  it('uses the light palette when no theme is passed and the document is not dark', () => {
    setDocumentTheme(false)

    expect(getModelColor('GPT-5.4')).toBe(getModelColor('GPT-5.4', 'light'))
    expect(getModelColorAlpha('Mystery Frontier Alpha', 0.16)).toBe(
      getModelColorAlpha('Mystery Frontier Alpha', 0.16, 'light'),
    )
  })
})
