// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
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

    expect(screen.getByRole('button', { name: '7D' })).toHaveClass('bg-primary')

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

    expect(screen.getByRole('button', { name: '7D' })).not.toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('bg-primary')

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

    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('bg-primary')

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

    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('bg-primary')
  }, 15000)

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

  it('exposes accessible names for the top-level filter comboboxes', () => {
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

    expect(screen.getByRole('combobox', { name: 'View mode' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Focus month' })).toBeInTheDocument()
  })

  it('renders a separate clear button for populated date fields and clears the value', () => {
    const onStartDateChange = vi.fn()
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
        startDate="2026-04-06"
        endDate={undefined}
        onStartDateChange={onStartDateChange}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    const clearButton = screen.getByRole('button', { name: 'Clear Start date' })

    expect(clearButton).toBeInTheDocument()
    fireEvent.click(clearButton)
    expect(onStartDateChange).toHaveBeenCalledWith(undefined)
  })

  it('exposes pressed state for preset, provider, and model toggles', () => {
    const noop = vi.fn()

    render(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={['Anthropic', 'OpenAI']}
        selectedProviders={['OpenAI']}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={['Claude Sonnet 4.5', 'GPT-5.4']}
        selectedModels={['GPT-5.4']}
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

    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'OpenAI' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Anthropic' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'GPT-5.4' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Claude Sonnet 4.5' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('marks unfiltered provider and model chips as included instead of selected', () => {
    const noop = vi.fn()

    render(
      <FilterBar
        viewMode="daily"
        onViewModeChange={noop}
        selectedMonth={null}
        onMonthChange={noop}
        availableMonths={['2026-03', '2026-04']}
        availableProviders={['Anthropic', 'OpenAI']}
        selectedProviders={[]}
        onToggleProvider={noop}
        onClearProviders={noop}
        allModels={['Claude Sonnet 4.5', 'GPT-5.4']}
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

    expect(screen.getByRole('button', { name: 'OpenAI' })).toHaveAttribute(
      'data-filter-state',
      'included',
    )
    expect(screen.getByRole('button', { name: 'OpenAI' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'GPT-5.4' })).toHaveAttribute(
      'data-filter-state',
      'included',
    )
    expect(screen.getByRole('button', { name: 'GPT-5.4' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the date picker as a dialog, supports arrow-key navigation, and restores focus on selection', async () => {
    const onStartDateChange = vi.fn()
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
        startDate="2026-04-06"
        endDate={undefined}
        onStartDateChange={onStartDateChange}
        onEndDateChange={noop}
        onApplyPreset={noop}
        onResetAll={noop}
      />,
    )

    const trigger = screen.getByRole('button', { name: /Mon, 04\/06\/2026|06\/04\/2026/i })
    fireEvent.click(trigger)
    await vi.runAllTimersAsync()

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const dialog = screen.getByRole('dialog', { name: 'Start date' })
    const daySix = within(dialog).getByRole('button', { name: /^Mon, 04\/06\/2026$/ })

    expect(daySix).toHaveFocus()
    expect(daySix).toHaveAttribute('aria-pressed', 'true')
    expect(daySix).toHaveAttribute('aria-current', 'date')

    fireEvent.keyDown(daySix, { key: 'ArrowRight' })
    await vi.runAllTimersAsync()

    const daySeven = within(dialog).getByRole('button', { name: /^Tue, 04\/07\/2026$/ })
    expect(daySeven).toHaveFocus()

    fireEvent.keyDown(daySeven, { key: 'Enter' })
    await vi.runAllTimersAsync()

    expect(onStartDateChange).toHaveBeenLastCalledWith('2026-04-07')
    expect(trigger).toHaveFocus()
  })
})
