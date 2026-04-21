import type { ComponentProps } from 'react'
import type { DailyUsage } from '@/types'
import { DrillDownModal } from '@/components/features/drill-down/DrillDownModal'
import { renderWithAppProviders } from '../test-utils'

export function renderDrillDownModal(props: Partial<ComponentProps<typeof DrillDownModal>>) {
  const day = props.day
  if (!day) {
    throw new Error('Expected drill-down day')
  }

  return renderWithAppProviders(
    <DrillDownModal
      day={day}
      contextData={props.contextData ?? [day]}
      open={props.open ?? true}
      hasPrevious={props.hasPrevious}
      hasNext={props.hasNext}
      currentIndex={props.currentIndex}
      totalCount={props.totalCount}
      onPrevious={props.onPrevious}
      onNext={props.onNext}
      onClose={props.onClose ?? (() => {})}
    />,
  )
}

export function buildDetailedDayFixture() {
  const previousDay: DailyUsage = {
    date: '2026-04-06',
    inputTokens: 300,
    outputTokens: 120,
    cacheCreationTokens: 30,
    cacheReadTokens: 50,
    thinkingTokens: 0,
    totalTokens: 500,
    totalCost: 15,
    requestCount: 6,
    modelsUsed: ['gpt-5.4', 'claude-opus-4.1'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.4',
        inputTokens: 200,
        outputTokens: 80,
        cacheCreationTokens: 20,
        cacheReadTokens: 40,
        thinkingTokens: 0,
        cost: 8,
        requestCount: 4,
      },
      {
        modelName: 'claude-opus-4.1',
        inputTokens: 100,
        outputTokens: 40,
        cacheCreationTokens: 10,
        cacheReadTokens: 10,
        thinkingTokens: 0,
        cost: 7,
        requestCount: 2,
      },
    ],
  }

  const selectedDay: DailyUsage = {
    date: '2026-04-07',
    inputTokens: 700,
    outputTokens: 230,
    cacheCreationTokens: 40,
    cacheReadTokens: 80,
    thinkingTokens: 50,
    totalTokens: 1,
    totalCost: 28,
    requestCount: 10,
    modelsUsed: ['gpt-5.4', 'claude-opus-4.1'],
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
        modelName: 'claude-opus-4.1',
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

  return { previousDay, selectedDay }
}
