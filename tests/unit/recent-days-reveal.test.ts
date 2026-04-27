import { describe, expect, it, vi } from 'vitest'
import {
  getShowAllInitialVisibleCount,
  scheduleProgressiveRowReveal,
} from '@/lib/sortable-table-data'

describe('RecentDays progressive reveal helpers', () => {
  it('computes the initial show-all batch size from the configured limits', () => {
    expect(getShowAllInitialVisibleCount(20)).toBe(20)
    expect(getShowAllInitialVisibleCount(150)).toBe(150)
    expect(getShowAllInitialVisibleCount(151)).toBe(150)
  })

  it('returns null and avoids scheduling when all rows fit in the initial batch', () => {
    const updates: number[] = []
    const scheduleFrame = vi.fn<(callback: FrameRequestCallback) => number>()

    const frameId = scheduleProgressiveRowReveal(
      150,
      (value) => {
        updates.push(typeof value === 'number' ? value : value(updates.at(-1) ?? 30))
      },
      scheduleFrame,
    )

    expect(frameId).toBeNull()
    expect(updates).toEqual([150])
    expect(scheduleFrame).not.toHaveBeenCalled()
  })

  it('schedules an animation frame only when rows remain after the initial batch', () => {
    const updates: number[] = []
    const scheduleFrame = vi.fn<(callback: FrameRequestCallback) => number>().mockReturnValue(1)

    const frameId = scheduleProgressiveRowReveal(
      151,
      (value) => {
        updates.push(typeof value === 'number' ? value : value(updates.at(-1) ?? 30))
      },
      scheduleFrame,
    )

    expect(frameId).toBe(1)
    expect(updates).toEqual([150])
    expect(scheduleFrame).toHaveBeenCalledTimes(1)
  })

  it('reveals the final batch when the queued frame runs', () => {
    const updates: number[] = []
    let queuedCallback: FrameRequestCallback | null = null

    const scheduleFrame = vi
      .fn<(callback: FrameRequestCallback) => number>()
      .mockImplementation((callback) => {
        queuedCallback = callback
        return 1
      })

    scheduleProgressiveRowReveal(
      151,
      (value) => {
        updates.push(typeof value === 'number' ? value : value(updates.at(-1) ?? 30))
      },
      scheduleFrame,
    )

    queuedCallback?.(0)

    expect(updates).toEqual([150, 151])
    expect(scheduleFrame).toHaveBeenCalledTimes(1)
  })
})
