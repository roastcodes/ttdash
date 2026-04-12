// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilterBar } from '@/components/layout/FilterBar'
import { initI18n } from '@/lib/i18n'

describe('FilterBar', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T12:00:00Z'))
    await initI18n('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives preset highlighting from the actual date range and clears it for custom ranges or month filters', () => {
    const noop = vi.fn()

    const { rerender } = render(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={[]}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={[]}
        selectedModels={[]}
        onToggleModel={noop}
        onClearModels={noop}
        startDate="2026-03-31"
        endDate="2026-04-06"
        onStartDateChange={noop}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    expect(screen.getByRole('button', { name: '7D' }).className).toContain('bg-primary')

    rerender(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={[]}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={[]}
        selectedModels={[]}
        onToggleModel={noop}
        onClearModels={noop}
        startDate="2026-03-30"
        endDate="2026-04-06"
        onStartDateChange={noop}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    expect(screen.getByRole('button', { name: '7D' }).className).not.toContain('bg-primary')
    expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-primary')

    rerender(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={[]}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={[]}
        selectedModels={[]}
        onToggleModel={noop}
        onClearModels={noop}
        startDate={undefined}
        endDate={undefined}
        onStartDateChange={noop}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    expect(screen.getByRole('button', { name: 'All' }).className).toContain('bg-primary')

    rerender(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth="2026-03"
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={[]}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={[]}
        selectedModels={[]}
        onToggleModel={noop}
        onClearModels={noop}
        startDate={undefined}
        endDate={undefined}
        onStartDateChange={noop}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-primary')
  })

  it('localizes the calendar month navigation aria labels', () => {
    const noop = vi.fn()

    render(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={[]}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={[]}
        selectedModels={[]}
        onToggleModel={noop}
        onClearModels={noop}
        startDate={undefined}
        endDate={undefined}
        onStartDateChange={noop}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start date' }))
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument()
  })
})
