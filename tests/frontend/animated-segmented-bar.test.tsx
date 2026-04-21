// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnimatedSegmentedBar } from '@/components/ui/AnimatedSegmentedBar'
import { renderWithAppProviders } from '../test-utils'

describe('AnimatedSegmentedBar', () => {
  it('clamps segment widths in reduced-motion mode', () => {
    renderWithAppProviders(
      <AnimatedSegmentedBar
        data-testid="segmented-bar"
        segments={[
          { id: 'negative', width: -15, color: '#f00', label: 'Negative' },
          { id: 'overflow', width: 140, color: '#0f0', label: 'Overflow' },
        ]}
      />,
      { motionPreference: 'always' },
    )

    expect(screen.getByTestId('segmented-bar-negative')).toHaveAttribute('data-target-width', '0%')
    expect(screen.getByTestId('segmented-bar-overflow')).toHaveAttribute(
      'data-target-width',
      '100%',
    )
  })

  it('clamps segment widths in animated mode', () => {
    renderWithAppProviders(
      <AnimatedSegmentedBar
        data-testid="segmented-bar"
        segments={[
          { id: 'negative', width: -15, color: '#f00', label: 'Negative' },
          { id: 'overflow', width: 140, color: '#0f0', label: 'Overflow' },
        ]}
      />,
      { motionPreference: 'never' },
    )

    expect(screen.getByTestId('segmented-bar-negative')).toHaveAttribute('data-target-width', '0%')
    expect(screen.getByTestId('segmented-bar-overflow')).toHaveAttribute(
      'data-target-width',
      '100%',
    )
  })
})
