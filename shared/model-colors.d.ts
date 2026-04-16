/** Lists the supported shared model color themes. */
export type ModelColorTheme = 'dark' | 'light'

/** Describes the HSL values assigned to one model color. */
export interface ModelColorSpec {
  h: number
  s: number
  l: number
}

/** Configures shared model color resolution. */
export interface ModelColorOptions {
  theme?: ModelColorTheme
  alpha?: number
}

/** Resolves the color for a model name within a dataset-scoped palette. */
export interface ModelColorPalette {
  getColor(name: string, options?: ModelColorOptions): string
  getColorRgb(name: string, options?: ModelColorOptions): string
  getColorSpec(name: string, options?: ModelColorOptions): ModelColorSpec
}

/** Normalizes an unknown theme value to a supported color theme. */
export function normalizeTheme(theme?: string): ModelColorTheme
/** Builds a shared model palette for the current dataset-wide model set. */
export function createModelColorPalette(modelNames?: string[]): ModelColorPalette
/** Returns the shared color spec for a normalized model name. */
export function getModelColorSpec(name: string, options?: ModelColorOptions): ModelColorSpec
/** Returns the shared model color as an HSL string. */
export function getModelColor(name: string, options?: ModelColorOptions): string
/** Returns the shared model color as an RGB string. */
export function getModelColorRgb(name: string, options?: ModelColorOptions): string
