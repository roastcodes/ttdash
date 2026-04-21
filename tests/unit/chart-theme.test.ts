import { describe, expect, it } from 'vitest'
import {
  CHART_ANIMATION,
  getScatterAnimationProps,
  scopedGradientId,
} from '@/components/charts/chart-theme'

describe('chart theme helpers', () => {
  it('uses the reveal duration for scatter animation timing', () => {
    const props = getScatterAnimationProps(true, 70)

    expect(props.isAnimationActive).toBe(true)
    expect(props.animationBegin).toBe(CHART_ANIMATION.chartStartDelay + 70)
    expect(props.animationDuration).toBe(CHART_ANIMATION.revealDuration)
  })

  it('keeps scoped gradient ids distinct for raw series names that normalize to the same slug', () => {
    const left = scopedGradientId('chart-1', 'gpt-4.1')
    const right = scopedGradientId('chart-1', 'gpt 4 1')

    expect(left).not.toBe(right)
    expect(left).toMatch(/^grad-/)
    expect(right).toMatch(/^grad-/)
  })
})
