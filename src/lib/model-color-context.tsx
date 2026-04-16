import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createModelColorPalette, type ModelColorTheme } from '../../shared/model-colors.js'
import {
  getModelColor as getFallbackModelColor,
  getModelColorAlpha as getFallbackModelColorAlpha,
  resolveModelTheme,
} from './model-utils'

const ModelColorPaletteContext = createContext<ReturnType<typeof createModelColorPalette> | null>(
  null,
)

interface ModelColorPaletteProviderProps {
  modelNames: string[]
  children: ReactNode
}

/** Provides the current dataset-scoped model palette to dashboard consumers. */
export function ModelColorPaletteProvider({
  modelNames,
  children,
}: ModelColorPaletteProviderProps) {
  const palette = useMemo(() => createModelColorPalette(modelNames), [modelNames])

  return (
    <ModelColorPaletteContext.Provider value={palette}>
      {children}
    </ModelColorPaletteContext.Provider>
  )
}

/** Returns reactive model-color helpers bound to the current palette context. */
export function useModelColorHelpers() {
  const palette = useContext(ModelColorPaletteContext)

  return useMemo(
    () => ({
      getModelColor: (name: string, theme?: ModelColorTheme) => {
        if (!palette) {
          return getFallbackModelColor(name, theme)
        }
        return palette.getColor(name, { theme: resolveModelTheme(theme) })
      },
      getModelColorAlpha: (name: string, alpha: number, theme?: ModelColorTheme) => {
        if (!palette) {
          return getFallbackModelColorAlpha(name, alpha, theme)
        }
        return palette.getColor(name, {
          theme: resolveModelTheme(theme),
          alpha,
        })
      },
    }),
    [palette],
  )
}
