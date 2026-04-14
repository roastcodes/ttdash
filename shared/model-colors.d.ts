export type ModelColorTheme = 'dark' | 'light'

export interface ModelColorSpec {
  h: number
  s: number
  l: number
}

export interface ModelColorOptions {
  theme?: ModelColorTheme
  alpha?: number
}

export function normalizeTheme(theme?: string): ModelColorTheme
export function getModelColorSpec(name: string, options?: ModelColorOptions): ModelColorSpec
export function getModelColor(name: string, options?: ModelColorOptions): string
export function getModelColorRgb(name: string, options?: ModelColorOptions): string
