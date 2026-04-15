/** Exposes the app version injected at build time. */
export const VERSION = __APP_VERSION__
/** Points to the canonical GitHub repository. */
export const GITHUB_REPO_URL = 'https://github.com/roastcodes/ttdash'
/** Points to the GitHub issues tracker. */
export const GITHUB_ISSUES_URL = 'https://github.com/roastcodes/ttdash/issues'
/** Points to the current npm package version page. */
export const NPM_PACKAGE_URL = `https://www.npmjs.com/package/@roastcodes/ttdash/v/${VERSION}`

/** Lists localized weekday labels for compact calendar displays. */
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Maps view modes to their localized UI labels. */
export const VIEW_MODE_LABELS = {
  daily: 'Tagesansicht',
  monthly: 'Monatsansicht',
  yearly: 'Jahresansicht',
} as const

/** Defines fallback per-million token prices for known models. */
export const MODEL_PRICES: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  'Opus 4.6': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'Opus 4.5': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'Sonnet 4.6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'Sonnet 4.5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'Haiku 4.5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  'GPT-5.4': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'GPT-5': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'Gemini 3 Flash Preview': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  Gemini: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  OpenCode: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
}
