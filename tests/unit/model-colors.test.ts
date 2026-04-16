import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getModelColor,
  getModelColorAlpha,
  resetActiveModelColorPalette,
  setActiveModelColorPalette,
} from '@/lib/model-utils'

const require = createRequire(import.meta.url)
const {
  createModelColorPalette,
  getModelColor: getSharedModelColor,
  getModelColorRgb,
  getModelColorSpec,
} = require('../../shared/model-colors.js') as {
  createModelColorPalette: (modelNames?: string[]) => {
    getColor: (name: string, options?: { theme?: 'light' | 'dark'; alpha?: number }) => string
    getColorRgb: (name: string, options?: { theme?: 'light' | 'dark'; alpha?: number }) => string
    getColorSpec: (
      name: string,
      options?: { theme?: 'light' | 'dark'; alpha?: number },
    ) => { h: number; s: number; l: number }
  }
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
    resetActiveModelColorPalette()
  })

  it('keeps the base family color on the latest known version in a dataset palette', () => {
    const palette = createModelColorPalette([
      'GPT-5',
      'GPT-5.4',
      'Claude Sonnet 4.5',
      'Claude Sonnet 4.6',
    ])

    expect(palette.getColor('GPT-5.4', { theme: 'dark' })).toBe('hsl(148, 72%, 57%)')
    expect(palette.getColor('GPT-5.4', { theme: 'light' })).toBe('hsl(148, 68%, 40%)')
    expect(palette.getColor('Claude Sonnet 4.6', { theme: 'dark' })).toBe('hsl(214, 80%, 63%)')
    expect(palette.getColor('Claude Sonnet 4.6', { theme: 'light' })).toBe('hsl(214, 72%, 44%)')
  })

  it('lightens older versions of the same family bucket inside a dataset palette', () => {
    const palette = createModelColorPalette(['Claude Opus 4.5', 'Claude Opus 4.6'])
    const latestDark = palette.getColorSpec('Claude Opus 4.6', { theme: 'dark' })
    const olderDark = palette.getColorSpec('Claude Opus 4.5', { theme: 'dark' })
    const latestLight = palette.getColorSpec('Claude Opus 4.6', { theme: 'light' })
    const olderLight = palette.getColorSpec('Claude Opus 4.5', { theme: 'light' })

    expect(olderDark.l).toBeGreaterThan(latestDark.l)
    expect(olderDark.h).toBe(latestDark.h)
    expect(olderLight.l).toBeGreaterThan(latestLight.l)
    expect(olderLight.h).toBe(latestLight.h)
  })

  it('keeps model families recognizable while separating version buckets dynamically', () => {
    const palette = createModelColorPalette([
      'GPT-5',
      'GPT-5.4',
      'Claude Opus 4.5',
      'Claude Opus 4.6',
      'Gemini 2.5 Pro',
      'Gemini 3 Flash Preview',
    ])

    expect(palette.getColor('GPT-5.4', { theme: 'dark' })).not.toBe(
      palette.getColor('GPT-5', { theme: 'dark' }),
    )
    expect(palette.getColor('Claude Opus 4.6', { theme: 'dark' })).not.toBe(
      palette.getColor('Claude Opus 4.5', { theme: 'dark' }),
    )
    expect(palette.getColor('Gemini 3 Flash Preview', { theme: 'light' })).not.toBe(
      palette.getColor('Gemini 2.5 Pro', { theme: 'light' }),
    )
  })

  it('maps prefixed and unprefixed Anthropic display names to the same family palette entry', () => {
    const palette = createModelColorPalette(['Claude Sonnet 4.5', 'Sonnet 4.5', 'Opus 4.6'])

    expect(palette.getColor('Claude Sonnet 4.5', { theme: 'dark' })).toBe(
      palette.getColor('Sonnet 4.5', { theme: 'dark' }),
    )
    expect(palette.getColor('Claude Opus 4.6', { theme: 'light' })).toBe(
      palette.getColor('Opus 4.6', { theme: 'light' }),
    )
  })

  it('falls back to the base family color when no dataset palette is active', () => {
    expect(getModelColor('GPT-5.4', 'dark')).toBe('hsl(148, 72%, 57%)')
    expect(getModelColor('GPT-5.4', 'light')).toBe('hsl(148, 68%, 40%)')
    expect(getModelColor('Claude Sonnet 4.5', 'dark')).toBe('hsl(214, 80%, 63%)')
    expect(getModelColor('Claude Sonnet 4.5', 'light')).toBe('hsl(214, 72%, 44%)')
    expect(getModelColor('Gemini 2.5 Pro', 'dark')).toBe('hsl(40, 88%, 49%)')
    expect(getModelColor('Gemini 2.5 Pro', 'light')).toBe('hsl(38, 86%, 34%)')
  })

  it('returns deterministic fallback colors for unknown models and tunes them per theme', () => {
    const dark = getModelColor('Mystery Frontier Alpha', 'dark')
    const light = getModelColor('Mystery Frontier Alpha', 'light')

    expect(dark).toBe(getModelColor('Mystery Frontier Alpha', 'dark'))
    expect(light).toBe(getModelColor('Mystery Frontier Alpha', 'light'))
    expect(dark).not.toBe(light)
  })

  it('creates valid alpha variants for chip and bar backgrounds', () => {
    setActiveModelColorPalette(['GPT-5', 'GPT-5.4', 'Claude Sonnet 4.5', 'Claude Sonnet 4.6'])

    expect(getModelColorAlpha('GPT-5.4', 0.16, 'dark')).toBe('hsla(148, 72%, 57%, 0.16)')
    expect(getModelColorAlpha('Claude Sonnet 4.5', 0.16, 'light')).toBe('hsla(214, 70%, 50%, 0.16)')
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

  it('keeps the active app palette stable across filtered surfaces until the dataset changes', () => {
    setActiveModelColorPalette(['Claude Opus 4.5', 'Claude Opus 4.6'])
    const withLatestLoaded = getModelColor('Claude Opus 4.5', 'light')

    setActiveModelColorPalette(['Claude Opus 4.5'])
    const withoutLatestLoaded = getModelColor('Claude Opus 4.5', 'light')

    expect(withLatestLoaded).not.toBe(withoutLatestLoaded)
    expect(withoutLatestLoaded).toBe('hsl(274, 68%, 44%)')
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
