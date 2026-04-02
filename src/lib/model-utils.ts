import { MODEL_COLORS, MODEL_COLOR_DEFAULT } from './constants'

const DYNAMIC_COLOR_CACHE = new Map<string, string>()

function titleCaseSegment(segment: string): string {
  if (!segment) return segment
  if (/^\d+([.-]\d+)*$/.test(segment)) return segment.replace(/-/g, '.')
  if (/^[a-z]{1,4}\d+$/i.test(segment)) return segment.toUpperCase()
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function dynamicColor(name: string): string {
  const cached = DYNAMIC_COLOR_CACHE.get(name)
  if (cached) return cached

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }

  const hue = Math.abs(hash) % 360
  const saturation = 62 + (Math.abs(hash) % 12)
  const lightness = 54 + (Math.abs(hash >> 3) % 8)
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  DYNAMIC_COLOR_CACHE.set(name, color)
  return color
}

export function normalizeModelName(raw: string): string {
  const lower = raw.toLowerCase().trim()
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

  const stripped = raw
    .trim()
    .replace(/^(claude|anthropic|openai|google|vertex|models)\//i, '')
    .replace(/^(claude|anthropic|openai|google|vertex|models)-/i, '')
    .replace(/^model[:/ -]*/i, '')
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  const familyMatch = stripped.match(/(gpt|opus|sonnet|haiku|gemini|o\d|oai|grok|llama|mistral|command|deepseek|qwen)[- ]?([a-z0-9.-]+)?/i)
  if (familyMatch) {
    const family = familyMatch[1]
    const suffix = familyMatch[2]?.replace(/-/g, '.') ?? ''
    if (/^gpt$/i.test(family) && suffix) return `GPT-${suffix.toUpperCase()}`
    if (/^(o\d)$/i.test(family)) return family.toUpperCase()
    return `${titleCaseSegment(family)}${suffix ? ` ${suffix}` : ''}`.trim()
  }

  return stripped
    .split('-')
    .filter(Boolean)
    .map(titleCaseSegment)
    .join(' ') || raw
}

export function getModelProvider(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('gpt') || lower.includes('openai') || lower.includes('/o1') || lower.includes('/o3') || /\bo\d\b/.test(lower)) return 'OpenAI'
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) return 'Anthropic'
  if (lower.includes('gemini')) return 'Google'
  if (lower.includes('grok') || lower.includes('xai')) return 'xAI'
  if (lower.includes('llama') || lower.includes('meta-llama') || lower.includes('meta/')) return 'Meta'
  if (lower.includes('command') || lower.includes('cohere')) return 'Cohere'
  if (lower.includes('mistral')) return 'Mistral'
  if (lower.includes('deepseek')) return 'DeepSeek'
  if (lower.includes('qwen') || lower.includes('alibaba')) return 'Alibaba'
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
    case 'xAI':
      return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
    case 'Meta':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'Cohere':
      return 'bg-lime-500/10 text-lime-400 border-lime-500/20'
    case 'Mistral':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    case 'DeepSeek':
      return 'bg-teal-500/10 text-teal-300 border-teal-500/20'
    case 'Alibaba':
      return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
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
    case 'xAI':
      return { color: 'rgb(232, 121, 249)', backgroundColor: 'rgba(217, 70, 239, 0.10)', borderColor: 'rgba(217, 70, 239, 0.20)' }
    case 'Meta':
      return { color: 'rgb(96, 165, 250)', backgroundColor: 'rgba(59, 130, 246, 0.10)', borderColor: 'rgba(59, 130, 246, 0.20)' }
    case 'Cohere':
      return { color: 'rgb(163, 230, 53)', backgroundColor: 'rgba(132, 204, 22, 0.10)', borderColor: 'rgba(132, 204, 22, 0.20)' }
    case 'Mistral':
      return { color: 'rgb(252, 211, 77)', backgroundColor: 'rgba(245, 158, 11, 0.10)', borderColor: 'rgba(245, 158, 11, 0.20)' }
    case 'DeepSeek':
      return { color: 'rgb(45, 212, 191)', backgroundColor: 'rgba(20, 184, 166, 0.10)', borderColor: 'rgba(20, 184, 166, 0.20)' }
    case 'Alibaba':
      return { color: 'rgb(250, 204, 21)', backgroundColor: 'rgba(234, 179, 8, 0.10)', borderColor: 'rgba(234, 179, 8, 0.20)' }
    case 'OpenCode':
      return { color: 'rgb(34, 211, 238)', backgroundColor: 'rgba(6, 182, 212, 0.10)', borderColor: 'rgba(6, 182, 212, 0.20)' }
    default:
      return { color: 'rgb(148, 163, 184)', backgroundColor: 'rgba(100, 116, 139, 0.10)', borderColor: 'rgba(100, 116, 139, 0.20)' }
  }
}

export function getModelColor(name: string): string {
  return MODEL_COLORS[name] ?? dynamicColor(name) ?? MODEL_COLOR_DEFAULT
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
