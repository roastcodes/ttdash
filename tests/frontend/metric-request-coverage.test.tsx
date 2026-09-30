import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrimaryMetrics } from '@/components/cards/PrimaryMetrics'
import { MonthMetrics } from '@/components/cards/MonthMetrics'
import { TodayMetrics } from '@/components/cards/TodayMetrics'
import { computeMetrics } from '@/lib/calculations'
import { initI18n } from '@/lib/i18n'
import { createDailyUsage } from '../factories'
import { renderWithAppProviders } from '../test-utils'

const known = createDailyUsage({ date: '2026-04-01', totalCost: 2, requestCount: 2 })
const unknown = createDailyUsage({ date: '2026-04-02', totalCost: 8, requestCount: 0 })
const metrics = computeMetrics([known, unknown])

describe('request coverage in KPI cards', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 3, 2, 12))
    await initI18n('en')
  })
  afterEach(() => vi.useRealTimers())

  it('keeps partial request averages unavailable while pricing the known subset', () => {
    renderWithAppProviders(<PrimaryMetrics metrics={metrics} />)
    expect(screen.getByText(/Avg n\/a \/ active day/)).toHaveTextContent('$1.00 / req')
  })

  it('does not turn a missing monthly counter into a zero request sample', () => {
    renderWithAppProviders(<MonthMetrics daily={[known, unknown]} metrics={metrics} />)
    expect(screen.getByText(/Avg n\/a\/day/)).toHaveTextContent('$1.00/req')
  })

  it('shows an explicitly known zero count and leaves per-request ratios unavailable', () => {
    const today = { ...unknown, requestCountStatus: 'known' as const }
    renderWithAppProviders(<TodayMetrics today={today} metrics={computeMetrics([today])} />)
    expect(screen.queryByText('No request counters')).not.toBeInTheDocument()
    expect(screen.getByText(/n\/a\/req/)).toBeInTheDocument()
  })
})
