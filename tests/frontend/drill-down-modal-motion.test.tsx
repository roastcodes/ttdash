// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHART_ANIMATION } from '@/components/charts/chart-theme'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { initI18n } from '@/lib/i18n'
import { APP_MOTION } from '@/lib/motion'
import type { DailyUsage } from '@/types'
import { renderWithAppProviders, withAppProviders } from '../test-utils'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({
    children,
    isAnimationActive,
    animationBegin,
    animationDuration,
    animationEasing,
  }: {
    children: ReactNode
    isAnimationActive?: boolean
    animationBegin?: number
    animationDuration?: number
    animationEasing?: string
  }) => (
    <div
      data-testid="drilldown-cost-share-pie"
      data-animate={String(Boolean(isAnimationActive))}
      data-begin={String(animationBegin ?? '')}
      data-duration={String(animationDuration ?? '')}
      data-easing={animationEasing ?? ''}
    >
      {children}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => null,
}))

function renderWithMotionPreference(
  ui: ReactNode,
  preference: 'system' | 'always' | 'never' = 'system',
) {
  return renderWithAppProviders(<>{ui}</>, { motionPreference: preference })
}

const RADIAL_ANIMATION_BEGIN_MS = CHART_ANIMATION.chartStartDelay + 20
const RADIAL_ANIMATION_DURATION_MS = CHART_ANIMATION.radialDuration
const RADIAL_ANIMATION_EASING = CHART_ANIMATION.easing
const TOKEN_INPUT_DELAY_MS = APP_MOTION.staggerMs * 2
const TOKEN_THINKING_DELAY_MS = APP_MOTION.staggerMs * 4
const TOKEN_SEGMENT_DURATION_MS = APP_MOTION.meterDurationMs

function buildDay(): DailyUsage {
  return {
    date: '2026-04-07',
    inputTokens: 700,
    outputTokens: 230,
    cacheCreationTokens: 40,
    cacheReadTokens: 80,
    thinkingTokens: 50,
    totalTokens: 1100,
    totalCost: 28,
    requestCount: 10,
    modelsUsed: ['gpt-5.4', 'claude-opus-4.7'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: 450,
        outputTokens: 150,
        cacheCreationTokens: 20,
        cacheReadTokens: 40,
        thinkingTokens: 40,
        cost: 18,
        requestCount: 6,
      },
      {
        modelName: 'claude-opus-4.7',
        inputTokens: 250,
        outputTokens: 80,
        cacheCreationTokens: 20,
        cacheReadTokens: 40,
        thinkingTokens: 10,
        cost: 10,
        requestCount: 4,
      },
    ],
  }
}

describe('DrillDownModal motion and positioning', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('pins the dialog to a fixed top offset instead of vertically centering it', () => {
    renderWithMotionPreference(
      <DrillDownModal day={buildDay()} contextData={[buildDay()]} open onClose={() => {}} />,
      'never',
    )

    const dialog = screen.getByTestId('drilldown-dialog')

    expect(dialog).toHaveClass('top-6')
    expect(dialog).toHaveClass('translate-y-0')
    expect(dialog).toHaveClass('data-[state=open]:slide-in-from-top-[2rem]')
    expect(dialog).not.toHaveClass('translate-y-[-50%]')
  })

  it('animates the cost-share donut only when reduced motion is not forced', () => {
    const day = buildDay()
    const { rerender } = renderWithMotionPreference(
      <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />,
      'always',
    )

    expect(screen.getByTestId('drilldown-cost-share-pie')).toHaveAttribute('data-animate', 'false')

    rerender(
      withAppProviders(<DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />, {
        motionPreference: 'never',
      }),
    )

    const pie = screen.getByTestId('drilldown-cost-share-pie')
    expect(pie).toHaveAttribute('data-animate', 'true')
    expect(pie).toHaveAttribute('data-begin', String(RADIAL_ANIMATION_BEGIN_MS))
    expect(pie).toHaveAttribute('data-duration', String(RADIAL_ANIMATION_DURATION_MS))
    expect(pie).toHaveAttribute('data-easing', RADIAL_ANIMATION_EASING)
  })

  it('animates token distribution segments through the shared motion policy', () => {
    const day = buildDay()
    const { rerender } = renderWithMotionPreference(
      <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />,
      'always',
    )

    const distribution = screen.getByTestId('drilldown-token-distribution')
    const inputSegment = within(distribution).getByTestId('drilldown-token-distribution-input')

    expect(inputSegment).toHaveAttribute('data-animate', 'false')
    expect(inputSegment).toHaveAttribute('data-target-width', '63.636%')
    expect(inputSegment).toHaveAttribute('data-delay-ms', '0')
    expect(inputSegment).toHaveAttribute('data-duration-ms', '0')

    rerender(
      withAppProviders(<DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />, {
        motionPreference: 'never',
      }),
    )

    const animatedDistribution = screen.getByTestId('drilldown-token-distribution')
    const animatedInput = within(animatedDistribution).getByTestId(
      'drilldown-token-distribution-input',
    )
    const animatedThinking = within(animatedDistribution).getByTestId(
      'drilldown-token-distribution-thinking',
    )

    expect(animatedInput).toHaveAttribute('data-animate', 'true')
    expect(animatedInput).toHaveAttribute('data-delay-ms', String(TOKEN_INPUT_DELAY_MS))
    expect(animatedInput).toHaveAttribute('data-duration-ms', String(TOKEN_SEGMENT_DURATION_MS))
    expect(animatedThinking).toHaveAttribute('data-delay-ms', String(TOKEN_THINKING_DELAY_MS))
  })
})
