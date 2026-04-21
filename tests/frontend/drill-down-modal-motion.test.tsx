// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'
import { AppMotionProvider } from '@/lib/motion'
import type { DailyUsage } from '@/types'

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
  return render(
    <AppMotionProvider preference={preference}>
      <TooltipProvider>{ui}</TooltipProvider>
    </AppMotionProvider>,
  )
}

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
      <AppMotionProvider preference="never">
        <TooltipProvider>
          <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />
        </TooltipProvider>
      </AppMotionProvider>,
    )

    const pie = screen.getByTestId('drilldown-cost-share-pie')
    expect(pie).toHaveAttribute('data-animate', 'true')
    expect(pie).toHaveAttribute('data-begin', '305')
    expect(pie).toHaveAttribute('data-duration', '1230')
    expect(pie).toHaveAttribute('data-easing', 'ease-out')
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
      <AppMotionProvider preference="never">
        <TooltipProvider>
          <DrillDownModal day={day} contextData={[day]} open onClose={() => {}} />
        </TooltipProvider>
      </AppMotionProvider>,
    )

    const animatedDistribution = screen.getByTestId('drilldown-token-distribution')
    const animatedInput = within(animatedDistribution).getByTestId(
      'drilldown-token-distribution-input',
    )
    const animatedThinking = within(animatedDistribution).getByTestId(
      'drilldown-token-distribution-thinking',
    )

    expect(animatedInput).toHaveAttribute('data-animate', 'true')
    expect(animatedInput).toHaveAttribute('data-delay-ms', '210')
    expect(animatedInput).toHaveAttribute('data-duration-ms', '960')
    expect(animatedThinking).toHaveAttribute('data-delay-ms', '420')
  })
})
