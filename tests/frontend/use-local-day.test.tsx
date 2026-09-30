import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocalDay } from '@/hooks/use-local-day'
import { localToday } from '@/lib/formatters'

afterEach(() => vi.useRealTimers())

describe('local calendar clock', () => {
  it('updates at local midnight and clears its timer on unmount', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 59))
    const { result, unmount } = renderHook(useLocalDay)
    expect(result.current).toBe('2026-09-30')
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe('2026-10-01')
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('refreshes after suspended tabs regain focus or change visibility', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 30, 12))
    const { result } = renderHook(useLocalDay)
    vi.setSystemTime(new Date(2026, 9, 1, 12))
    act(() => window.dispatchEvent(new Event('focus')))
    expect(result.current).toBe(localToday())
    vi.setSystemTime(new Date(2026, 9, 2, 12))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(result.current).toBe(localToday())
  })
})
