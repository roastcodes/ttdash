// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModelColorPaletteProvider, useModelColorHelpers } from '@/lib/model-color-context'

function ModelSwatches({ models }: { models: string[] }) {
  const { getModelColor } = useModelColorHelpers()

  return (
    <div>
      {models.map((model) => (
        <span key={model} data-testid={model} style={{ color: getModelColor(model, 'dark') }}>
          {model}
        </span>
      ))}
    </div>
  )
}

describe('ModelColorPaletteProvider', () => {
  it('applies version shading on the first render without waiting for a second rerender', () => {
    render(
      <ModelColorPaletteProvider
        modelNames={['Claude Opus 4.5', 'Claude Opus 4.6', 'Claude Opus 4.7']}
      >
        <ModelSwatches models={['Claude Opus 4.5', 'Claude Opus 4.6', 'Claude Opus 4.7']} />
      </ModelColorPaletteProvider>,
    )

    const opus45 = getComputedStyle(screen.getByTestId('Claude Opus 4.5')).color
    const opus46 = getComputedStyle(screen.getByTestId('Claude Opus 4.6')).color
    const opus47 = getComputedStyle(screen.getByTestId('Claude Opus 4.7')).color

    expect(opus45).not.toBe(opus46)
    expect(opus46).not.toBe(opus47)
    expect(opus45).not.toBe(opus47)
  })

  it('updates the palette when the dataset model set changes', () => {
    const { rerender } = render(
      <ModelColorPaletteProvider modelNames={['Claude Opus 4.5', 'Claude Opus 4.6']}>
        <ModelSwatches models={['Claude Opus 4.5']} />
      </ModelColorPaletteProvider>,
    )

    const shadedColor = getComputedStyle(screen.getByTestId('Claude Opus 4.5')).color

    rerender(
      <ModelColorPaletteProvider modelNames={['Claude Opus 4.5']}>
        <ModelSwatches models={['Claude Opus 4.5']} />
      </ModelColorPaletteProvider>,
    )

    const baseColor = getComputedStyle(screen.getByTestId('Claude Opus 4.5')).color

    expect(shadedColor).not.toBe(baseColor)
  })
})
