import { MODEL_COLORS, MODEL_COLOR_DEFAULT } from './constants'

export function normalizeModelName(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('gpt-5-4') || lower.includes('gpt-5.4')) return 'GPT-5.4'
  if (lower.includes('gpt-5')) return 'GPT-5'
  if (lower.includes('opus-4-6') || lower.includes('opus-4.6')) return 'Opus 4.6'
  if (lower.includes('opus-4-5') || lower.includes('opus-4.5')) return 'Opus 4.5'
  if (lower.includes('sonnet-4-6') || lower.includes('sonnet-4.6')) return 'Sonnet 4.6'
  if (lower.includes('sonnet-4-5') || lower.includes('sonnet-4.5')) return 'Sonnet 4.5'
  if (lower.includes('haiku-4-5') || lower.includes('haiku-4.5')) return 'Haiku 4.5'
  if (lower.includes('gemini-3-flash-preview')) return 'Gemini 3 Flash Preview'
  if (lower.includes('gemini')) return 'Gemini'
  if (lower.includes('opencode')) return 'OpenCode'
  if (lower.includes('haiku')) return 'Haiku'
  // Fallback: capitalize segments
  return raw
    .replace(/^claude-/, '')
    .replace(/^openai-/, '')
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export function getModelProvider(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('gpt') || lower.includes('openai')) return 'OpenAI'
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) return 'Anthropic'
  if (lower.includes('gemini')) return 'Google'
  if (lower.includes('opencode')) return 'OpenCode'
  return 'Other'
}

export function getProviderBadgeClasses(provider: string): string {
  switch (provider) {
    case 'OpenAI':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'Anthropic':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Google':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'OpenCode':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function getProviderBadgeStyle(provider: string): { color: string; backgroundColor: string; borderColor: string } {
  switch (provider) {
    case 'OpenAI':
      return { color: 'rgb(52, 211, 153)', backgroundColor: 'rgba(16, 185, 129, 0.10)', borderColor: 'rgba(16, 185, 129, 0.20)' }
    case 'Anthropic':
      return { color: 'rgb(251, 146, 60)', backgroundColor: 'rgba(249, 115, 22, 0.10)', borderColor: 'rgba(249, 115, 22, 0.20)' }
    case 'Google':
      return { color: 'rgb(56, 189, 248)', backgroundColor: 'rgba(14, 165, 233, 0.10)', borderColor: 'rgba(14, 165, 233, 0.20)' }
    case 'OpenCode':
      return { color: 'rgb(34, 211, 238)', backgroundColor: 'rgba(6, 182, 212, 0.10)', borderColor: 'rgba(6, 182, 212, 0.20)' }
    default:
      return { color: 'rgb(148, 163, 184)', backgroundColor: 'rgba(100, 116, 139, 0.10)', borderColor: 'rgba(100, 116, 139, 0.20)' }
  }
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

export function getUniqueProviders(modelsUsed: string[][]): string[] {
  const set = new Set<string>()
  for (const models of modelsUsed) {
    for (const model of models) {
      set.add(getModelProvider(model))
    }
  }
  return Array.from(set).sort()
}
