import {
  getModelProvider as getSharedModelProvider,
  normalizeModelName as normalizeSharedModelName,
} from '../../shared/dashboard-domain.js'
import {
  createModelColorPalette,
  getModelColor as getSharedModelColor,
  type ModelColorPalette,
  type ModelColorTheme,
} from '../../shared/model-colors.js'

let activeModelColorPalette: ModelColorPalette | null = null

function resolveModelTheme(theme?: ModelColorTheme): ModelColorTheme {
  if (theme === 'light' || theme === 'dark') return theme
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Sets the dataset-wide model palette used by dashboard charts and tables. */
export function setActiveModelColorPalette(modelNames: string[] | null | undefined) {
  activeModelColorPalette =
    modelNames && modelNames.length > 0 ? createModelColorPalette(modelNames) : null
}

/** Clears the dataset-wide model palette so one-off lookups use fallback colors again. */
export function resetActiveModelColorPalette() {
  activeModelColorPalette = null
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

/** Returns inline badge styles for provider swatches and tooltips. */
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

/** Returns the canonical chart color for a model. */
export function getModelColor(name: string, theme?: ModelColorTheme): string {
  const resolvedTheme = resolveModelTheme(theme)
  return (
    activeModelColorPalette?.getColor(name, { theme: resolvedTheme }) ??
    getSharedModelColor(name, { theme: resolvedTheme })
  )
}

/** Returns the canonical chart color for a model with a custom alpha value. */
export function getModelColorAlpha(name: string, alpha: number, theme?: ModelColorTheme): string {
  const resolvedTheme = resolveModelTheme(theme)
  return (
    activeModelColorPalette?.getColor(name, { theme: resolvedTheme, alpha }) ??
    getSharedModelColor(name, {
      theme: resolvedTheme,
      alpha,
    })
  )
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
