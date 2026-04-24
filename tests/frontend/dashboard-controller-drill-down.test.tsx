// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDashboardControllerDrillDown } from '@/hooks/use-dashboard-controller-drill-down'
import { createDailyUsage } from '../factories'

describe('useDashboardControllerDrillDown', () => {
  it('builds sorted previous and next navigation from the filtered dashboard data', () => {
    const { result } = renderHook(() =>
      useDashboardControllerDrillDown([
        createDailyUsage({ date: '2026-04-03', totalCost: 3 }),
        createDailyUsage({ date: '2026-04-01', totalCost: 1 }),
        createDailyUsage({ date: '2026-04-02', totalCost: 2 }),
      ]),
    )

    act(() => {
      result.current.onDrillDownDateChange('2026-04-02')
    })

    expect(result.current.dialog).toMatchObject({
      open: true,
      hasPrevious: true,
      hasNext: true,
      currentIndex: 2,
      totalCount: 3,
    })
    expect(result.current.dialog.day?.date).toBe('2026-04-02')

    act(() => {
      result.current.dialog.onNext?.()
    })

    expect(result.current.dialog.day?.date).toBe('2026-04-03')

    act(() => {
      result.current.dialog.onPrevious?.()
    })

    expect(result.current.dialog.day?.date).toBe('2026-04-02')

    act(() => {
      result.current.dialog.onClose()
    })

    expect(result.current.dialog.open).toBe(false)
  })

  it('keeps the dialog safe when the selected day disappears from a later filtered result', () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: ReturnType<typeof createDailyUsage>[] }) =>
        useDashboardControllerDrillDown(data),
      {
        initialProps: {
          data: [
            createDailyUsage({ date: '2026-04-01', totalCost: 1 }),
            createDailyUsage({ date: '2026-04-02', totalCost: 2 }),
          ],
        },
      },
    )

    act(() => {
      result.current.onDrillDownDateChange('2026-04-02')
    })

    rerender({
      data: [createDailyUsage({ date: '2026-04-01', totalCost: 1 })],
    })

    expect(result.current.dialog).toMatchObject({
      open: true,
      day: null,
      hasPrevious: false,
      hasNext: false,
      currentIndex: 0,
      totalCount: 1,
    })
  })
})
