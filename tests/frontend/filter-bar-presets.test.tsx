// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilterBar } from '@/components/layout/FilterBar'
import { resolveDashboardPresetRange } from '@/lib/dashboard-preferences'
import { initI18n } from '@/lib/i18n'
import { buildFilterBarProps, renderFilterBar } from './filter-bar-test-helpers'

describe('FilterBar preset and chip states', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives preset highlighting from the actual date range and clears it for custom ranges or month filters', () => {
    const sevenDayRange = resolveDashboardPresetRange('7d', new Date())

    const { rerender } = renderFilterBar({
      ...sevenDayRange,
    })

    expect(screen.getByRole('button', { name: '7D' })).toHaveClass('bg-primary')

    rerender(
      <FilterBar
        {...buildFilterBarProps({
          startDate: '2026-03-30',
          endDate: '2026-04-06',
        })}
      />,
    )

    expect(screen.getByRole('button', { name: '7D' })).not.toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('bg-primary')

    rerender(<FilterBar {...buildFilterBarProps()} />)

    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('bg-primary')

    rerender(
      <FilterBar
        {...buildFilterBarProps({
          selectedMonth: '2026-03',
        })}
      />,
    )

    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('bg-primary')
  }, 15_000)

  it('exposes pressed state for preset, provider, and model toggles', () => {
    renderFilterBar({
      availableProviders: ['Anthropic', 'OpenAI'],
      selectedProviders: ['OpenAI'],
      allModels: ['Claude Sonnet 4.5', 'GPT-5.4'],
      selectedModels: ['GPT-5.4'],
      ...resolveDashboardPresetRange('7d', new Date()),
    })

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

  it('renders quick presets in the shared display order', () => {
    renderFilterBar()

    const presetLabels = screen
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((label): label is string =>
        ['7D', '30D', 'Month', 'Year', 'All'].includes(label ?? ''),
      )

    expect(presetLabels).toEqual(['7D', '30D', 'Month', 'Year', 'All'])
  })

  it('marks unfiltered provider and model chips as included instead of selected', () => {
    renderFilterBar({
      availableProviders: ['Anthropic', 'OpenAI'],
      allModels: ['Claude Sonnet 4.5', 'GPT-5.4'],
    })

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
})
