// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { renderFilterBar } from './filter-bar-test-helpers'

describe('FilterBar date picker interactions', () => {
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

  it('renders a separate clear button for populated date fields and clears the value', () => {
    const onStartDateChange = vi.fn()

    renderFilterBar({
      startDate: '2026-04-06',
      onStartDateChange,
    })

    const clearButton = screen.getByRole('button', { name: 'Clear Start date' })

    expect(clearButton).toBeInTheDocument()
    fireEvent.click(clearButton)
    expect(onStartDateChange).toHaveBeenCalledWith(undefined)
  })

  it('opens the date picker as a dialog, supports arrow-key navigation, and restores focus on selection', async () => {
    const onStartDateChange = vi.fn()

    renderFilterBar({
      startDate: '2026-04-06',
      onStartDateChange,
    })

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
