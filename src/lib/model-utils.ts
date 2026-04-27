import {
  getModelProvider as getSharedModelProvider,
  normalizeModelName as normalizeSharedModelName,
} from '../../shared/dashboard-domain.js'
import {
  getModelColor as getSharedModelColor,
  type ModelColorTheme,
} from '../../shared/model-colors.js'

/** Resolves the effective model-color theme, defaulting to the current document theme. */
export function resolveModelTheme(theme?: ModelColorTheme): ModelColorTheme {
  if (theme === 'light' || theme === 'dark') return theme
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Normalizes raw model names to their dashboard label. */
export function normalizeModelName(raw: string): string {
  return normalizeSharedModelName(raw)
}

/** Resolves a normalized provider name for a model identifier. */
export function getModelProvider(raw: string): string {
  return getSharedModelProvider(raw)
}

/** Returns badge classes for a provider pill in the current theme. */
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

interface ProviderBadgeStyleOptions {
  backgroundAlpha?: number
  borderAlpha?: number
}

interface ProviderBadgeStyle {
  color: string
  backgroundColor: string
  borderColor: string
}

function formatProviderBadgeStyle(
  color: string,
  rgb: string,
  options?: ProviderBadgeStyleOptions,
): ProviderBadgeStyle {
  const backgroundAlpha = (options?.backgroundAlpha ?? 0.1).toFixed(2)
  const borderAlpha = (options?.borderAlpha ?? 0.2).toFixed(2)

  return {
    color,
    backgroundColor: `rgba(${rgb}, ${backgroundAlpha})`,
    borderColor: `rgba(${rgb}, ${borderAlpha})`,
  }
}

/** Returns inline badge styles for provider swatches and tooltips. */
export function getProviderBadgeStyle(
  provider: string,
  options?: ProviderBadgeStyleOptions,
): ProviderBadgeStyle {
  switch (provider) {
    case 'OpenAI':
      return formatProviderBadgeStyle('rgb(52, 211, 153)', '16, 185, 129', options)
    case 'Anthropic':
      return formatProviderBadgeStyle('rgb(251, 146, 60)', '249, 115, 22', options)
    case 'Google':
      return formatProviderBadgeStyle('rgb(56, 189, 248)', '14, 165, 233', options)
    case 'xAI':
      return formatProviderBadgeStyle('rgb(232, 121, 249)', '217, 70, 239', options)
    case 'Meta':
      return formatProviderBadgeStyle('rgb(96, 165, 250)', '59, 130, 246', options)
    case 'Cohere':
      return formatProviderBadgeStyle('rgb(163, 230, 53)', '132, 204, 22', options)
    case 'Mistral':
      return formatProviderBadgeStyle('rgb(252, 211, 77)', '245, 158, 11', options)
    case 'DeepSeek':
      return formatProviderBadgeStyle('rgb(45, 212, 191)', '20, 184, 166', options)
    case 'Alibaba':
      return formatProviderBadgeStyle('rgb(250, 204, 21)', '234, 179, 8', options)
    case 'OpenCode':
      return formatProviderBadgeStyle('rgb(34, 211, 238)', '6, 182, 212', options)
    default:
      return formatProviderBadgeStyle('rgb(148, 163, 184)', '100, 116, 139', options)
  }
}

/** Returns the canonical chart color for a model. */
export function getModelColor(name: string, theme?: ModelColorTheme): string {
  return getSharedModelColor(name, { theme: resolveModelTheme(theme) })
}

/** Returns the canonical chart color for a model with a custom alpha value. */
export function getModelColorAlpha(name: string, alpha: number, theme?: ModelColorTheme): string {
  return getSharedModelColor(name, {
    theme: resolveModelTheme(theme),
    alpha,
  })
}

/** Collects unique normalized model names from nested model lists. */
export function getUniqueModels(modelsUsed: string[][]): string[] {
  const set = new Set<string>()
  for (const models of modelsUsed) {
    for (const m of models) {
      set.add(normalizeModelName(m))
    }
  }
  return Array.from(set).sort()
}

/** Collects unique providers from nested model lists. */
export function getUniqueProviders(modelsUsed: string[][]): string[] {
  const set = new Set<string>()
  for (const models of modelsUsed) {
    for (const model of models) {
      set.add(getModelProvider(model))
    }
  }
  return Array.from(set).sort()
}
