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
