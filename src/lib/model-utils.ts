import { MODEL_COLORS, MODEL_COLOR_DEFAULT } from './constants'

export function normalizeModelName(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('opus-4-6') || lower.includes('opus-4.6')) return 'Opus 4.6'
  if (lower.includes('opus-4-5') || lower.includes('opus-4.5')) return 'Opus 4.5'
  if (lower.includes('sonnet-4-6') || lower.includes('sonnet-4.6')) return 'Sonnet 4.6'
  if (lower.includes('sonnet-4-5') || lower.includes('sonnet-4.5')) return 'Sonnet 4.5'
  if (lower.includes('haiku-4-5') || lower.includes('haiku-4.5')) return 'Haiku 4.5'
  if (lower.includes('haiku')) return 'Haiku'
  // Fallback: capitalize segments
  return raw
    .replace(/^claude-/, '')
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export function getModelColor(name: string): string {
  return MODEL_COLORS[name] ?? MODEL_COLOR_DEFAULT
}

export function getUniqueModels(modelsUsed: string[][]): string[] {
  const set = new Set<string>()
  for (const models of modelsUsed) {
    for (const m of models) {
      set.add(normalizeModelName(m))
    }
  }
  return Array.from(set).sort()
}
