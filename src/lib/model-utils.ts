import { MODEL_COLORS, MODEL_COLOR_DEFAULT } from './constants'
import modelNormalizationSpec from '../../server/model-normalization.json'

const DYNAMIC_COLOR_CACHE = new Map<string, string>()
const DISPLAY_ALIASES = modelNormalizationSpec.displayAliases.map((alias) => ({
  ...alias,
  matcher: new RegExp(alias.pattern, 'i'),
}))
const PROVIDER_MATCHERS = modelNormalizationSpec.providerMatchers.map((matcher) => ({
  ...matcher,
  matcher: new RegExp(matcher.pattern, 'i'),
}))

function titleCaseSegment(segment: string): string {
  if (!segment) return segment
  if (/^\d+([.-]\d+)*$/.test(segment)) return segment.replace(/-/g, '.')
  if (/^[a-z]{1,4}\d+$/i.test(segment)) return segment.toUpperCase()
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function capitalize(segment: string): string {
  if (!segment) return ''
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function formatVersion(version: string): string {
  return version.replace(/-/g, '.')
}

function canonicalizeModelName(raw: string): string {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^model[:/ -]*/i, '')
    .replace(/^(anthropic|openai|google|vertex|models)[/-]/i, '')
    .replace(/\./g, '-')
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  const suffixStart = normalized.lastIndexOf('-')
  if (suffixStart > 0) {
    const suffix = normalized.slice(suffixStart + 1)
    if (suffix.length === 8 && suffix.startsWith('20') && /^\d+$/.test(suffix)) {
      return normalized.slice(0, suffixStart)
    }
  }

  return normalized
}

function parseClaudeName(rest: string): string {
  const parts = rest.split('-', 2)
  if (parts.length < 2) {
    return `Claude ${capitalize(rest)}`
  }
  return `${capitalize(parts[0] ?? '')} ${formatVersion(parts[1] ?? '')}`.trim()
}

function parseGptName(rest: string): string {
  const parts = rest.split('-')
  const variant = parts[0] ?? ''
  const minor = parts[1] ?? ''

  if (minor && minor.length <= 2 && /^\d+$/.test(minor)) {
    const version = `${variant}.${minor}`
    if (parts.length > 2) {
      const suffix = parts.slice(2).map(capitalize).join(' ')
      return `GPT-${version}${suffix ? ` ${suffix}` : ''}`
    }
    return `GPT-${version}`
  }

  if (parts.length > 1) {
    const suffix = parts.slice(1).map(capitalize).join(' ')
    return `GPT-${variant}${suffix ? ` ${suffix}` : ''}`
  }

  return `GPT-${rest}`
}

function parseGeminiName(rest: string): string {
  const parts = rest.split('-')
  if (parts.length < 2) {
    return `Gemini ${rest}`
  }

  const versionParts: string[] = []
  const tierParts: string[] = []

  for (const part of parts) {
    if (/^\d+$/.test(part) && tierParts.length === 0) {
      versionParts.push(part)
    } else {
      tierParts.push(capitalize(part))
    }
  }

  const version = versionParts.join('.')
  const tier = tierParts.join(' ')

  return tier ? `Gemini ${version} ${tier}` : `Gemini ${version}`
}

function parseCodexName(rest: string): string {
  const normalized = rest.replace(/-latest$/i, '')
  if (!normalized) {
    return 'Codex'
  }
  return `Codex ${normalized.split('-').map(capitalize).join(' ')}`
}

function parseOSeries(name: string): string {
  const separatorIndex = name.indexOf('-')
  if (separatorIndex === -1) {
    return name
  }
  return `${name.slice(0, separatorIndex)} ${capitalize(name.slice(separatorIndex + 1))}`
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
  const canonical = canonicalizeModelName(raw)
  for (const alias of DISPLAY_ALIASES) {
    if (alias.matcher.test(canonical)) {
      return alias.name
    }
  }

  if (canonical.startsWith('claude-')) {
    return parseClaudeName(canonical.slice('claude-'.length))
  }

  if (canonical.startsWith('gpt-')) {
    return parseGptName(canonical.slice('gpt-'.length))
  }

  if (canonical.startsWith('gemini-')) {
    return parseGeminiName(canonical.slice('gemini-'.length))
  }

  if (canonical.startsWith('codex-')) {
    return parseCodexName(canonical.slice('codex-'.length))
  }

  if (/^o\d/i.test(canonical)) {
    return parseOSeries(canonical)
  }

  const familyMatch = canonical.match(
    /^(gpt|opus|sonnet|haiku|gemini|codex|o\d|oai|grok|llama|mistral|command|deepseek|qwen)(?:-([a-z0-9-]+))?$/i,
  )
  if (familyMatch) {
    const family = familyMatch[1]
    if (!family) return canonical

    if (/^codex$/i.test(family)) {
      return parseCodexName(familyMatch[2] ?? '')
    }

    if (/^(o\d)$/i.test(family)) {
      return parseOSeries(canonical)
    }

    const suffix = familyMatch[2] ? formatVersion(familyMatch[2]) : ''
    if (/^gpt$/i.test(family) && suffix) return `GPT-${suffix.toUpperCase()}`
    return `${titleCaseSegment(family)}${suffix ? ` ${suffix}` : ''}`.trim()
  }

  return canonical.split('-').filter(Boolean).map(titleCaseSegment).join(' ') || raw
}

export function getModelProvider(raw: string): string {
  const canonical = canonicalizeModelName(raw)
  for (const matcher of PROVIDER_MATCHERS) {
    if (matcher.matcher.test(canonical)) {
      return matcher.provider
    }
  }
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

export function getProviderBadgeStyle(provider: string): {
  color: string
  backgroundColor: string
  borderColor: string
} {
  switch (provider) {
    case 'OpenAI':
      return {
        color: 'rgb(52, 211, 153)',
        backgroundColor: 'rgba(16, 185, 129, 0.10)',
        borderColor: 'rgba(16, 185, 129, 0.20)',
      }
    case 'Anthropic':
      return {
        color: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(249, 115, 22, 0.10)',
        borderColor: 'rgba(249, 115, 22, 0.20)',
      }
    case 'Google':
      return {
        color: 'rgb(56, 189, 248)',
        backgroundColor: 'rgba(14, 165, 233, 0.10)',
        borderColor: 'rgba(14, 165, 233, 0.20)',
      }
    case 'xAI':
      return {
        color: 'rgb(232, 121, 249)',
        backgroundColor: 'rgba(217, 70, 239, 0.10)',
        borderColor: 'rgba(217, 70, 239, 0.20)',
      }
    case 'Meta':
      return {
        color: 'rgb(96, 165, 250)',
        backgroundColor: 'rgba(59, 130, 246, 0.10)',
        borderColor: 'rgba(59, 130, 246, 0.20)',
      }
    case 'Cohere':
      return {
        color: 'rgb(163, 230, 53)',
        backgroundColor: 'rgba(132, 204, 22, 0.10)',
        borderColor: 'rgba(132, 204, 22, 0.20)',
      }
    case 'Mistral':
      return {
        color: 'rgb(252, 211, 77)',
        backgroundColor: 'rgba(245, 158, 11, 0.10)',
        borderColor: 'rgba(245, 158, 11, 0.20)',
      }
    case 'DeepSeek':
      return {
        color: 'rgb(45, 212, 191)',
        backgroundColor: 'rgba(20, 184, 166, 0.10)',
        borderColor: 'rgba(20, 184, 166, 0.20)',
      }
    case 'Alibaba':
      return {
        color: 'rgb(250, 204, 21)',
        backgroundColor: 'rgba(234, 179, 8, 0.10)',
        borderColor: 'rgba(234, 179, 8, 0.20)',
      }
    case 'OpenCode':
      return {
        color: 'rgb(34, 211, 238)',
        backgroundColor: 'rgba(6, 182, 212, 0.10)',
        borderColor: 'rgba(6, 182, 212, 0.20)',
      }
    default:
      return {
        color: 'rgb(148, 163, 184)',
        backgroundColor: 'rgba(100, 116, 139, 0.10)',
        borderColor: 'rgba(100, 116, 139, 0.20)',
      }
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
