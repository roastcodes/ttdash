import { describe, expect, it } from 'vitest'
import { CHART_ANIMATION, getScatterAnimationProps } from '@/components/charts/chart-theme'

describe('chart theme helpers', () => {
  it('uses the reveal duration for scatter animation timing', () => {
    const props = getScatterAnimationProps(true, 70)

    expect(props.isAnimationActive).toBe(true)
    expect(props.animationBegin).toBe(CHART_ANIMATION.chartStartDelay + 70)
    expect(props.animationDuration).toBe(CHART_ANIMATION.revealDuration)
  })
})
