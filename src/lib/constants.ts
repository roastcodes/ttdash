export const VERSION = __APP_VERSION__

export const MODEL_COLORS: Record<string, string> = {
  'Opus 4.6': 'hsl(262, 60%, 55%)',
  'Opus 4.5': 'hsl(340, 55%, 52%)',
  'Sonnet 4.6': 'hsl(215, 70%, 55%)',
  'Sonnet 4.5': 'hsl(160, 50%, 42%)',
  'Haiku 4.5': 'hsl(35, 80%, 52%)',
  'GPT-5.4': 'hsl(12, 78%, 56%)',
  'GPT-5': 'hsl(12, 78%, 56%)',
  'Gemini 3 Flash Preview': 'hsl(48, 92%, 50%)',
  'Gemini': 'hsl(48, 92%, 50%)',
  'OpenCode': 'hsl(186, 58%, 48%)',
}

export const MODEL_COLOR_DEFAULT = 'hsl(220, 8%, 56%)'

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export const VIEW_MODE_LABELS = {
  daily: 'Tagesansicht',
  monthly: 'Monatsansicht',
  yearly: 'Jahresansicht',
} as const

export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'Opus 4.6': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'Opus 4.5': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'Sonnet 4.6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'Sonnet 4.5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'Haiku 4.5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  'GPT-5.4': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'GPT-5': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'Gemini 3 Flash Preview': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'Gemini': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  'OpenCode': { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
}
