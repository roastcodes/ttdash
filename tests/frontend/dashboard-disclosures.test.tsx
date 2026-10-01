// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Disclosure } from '@/components/ui/disclosure'
import { FilterBar } from '@/components/layout/FilterBar'
import { initI18n } from '@/lib/i18n'
import { renderWithAppProviders } from '../test-utils'
import { buildFilterBarProps } from './filter-bar-test-helpers'

describe('dashboard supplementary content', () => {
  beforeEach(async () => {
    await initI18n('en')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('defers supplementary content and retains its state after closing and reopening', () => {
    renderWithAppProviders(
      <Disclosure label="Details">
        <input aria-label="Chart selection" defaultValue="all" />
      </Disclosure>,
      { motionPreference: 'always' },
    )
    const toggle = screen.getByRole('button', { name: 'Details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    const input = screen.getByRole('textbox', { name: 'Chart selection' })
    fireEvent.change(input, { target: { value: 'OpenAI' } })
    fireEvent.click(toggle)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByRole('textbox')).toBe(input)
    expect(input).toHaveValue('OpenAI')
    expect(input.closest('[id]')).toHaveAttribute('id', toggle.getAttribute('aria-controls'))
  })

  it.each([true, false])(
    'opens desktop metric details according to the initial viewport (%s)',
    (desktop) => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: desktop, addEventListener() {}, removeEventListener() {} })),
      )
      renderWithAppProviders(
        <Disclosure label="Metrics" desktopOpen>
          Extra metrics
        </Disclosure>,
        { motionPreference: 'always' },
      )
      expect(screen.getByRole('button', { name: 'Metrics' })).toHaveAttribute(
        'aria-expanded',
        String(desktop),
      )
    },
  )

  it('keeps active filters removable while their detailed controls are collapsed', () => {
    const onToggleProvider = vi.fn()
    const onToggleModel = vi.fn()
    const onToggleSystem = vi.fn()
    const onStartDateChange = vi.fn()
    const onEndDateChange = vi.fn()
    renderWithAppProviders(
      <FilterBar
        {...buildFilterBarProps({
          selectedProviders: ['OpenAI'],
          selectedModels: ['GPT-5.4'],
          selectedSystems: ['workstation'],
          startDate: '2026-04-01',
          endDate: '2026-04-05',
          onToggleProvider,
          onToggleModel,
          onToggleSystem,
          onStartDateChange,
          onEndDateChange,
        })}
      />,
      { motionPreference: 'always' },
    )
    expect(screen.getByRole('button', { name: 'More filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove OpenAI filter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove GPT-5.4 filter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove workstation filter' }))
    fireEvent.click(screen.getByRole('button', { name: /Remove Date filter active/ }))
    expect(onToggleProvider).toHaveBeenCalledWith('OpenAI')
    expect(onToggleModel).toHaveBeenCalledWith('GPT-5.4')
    expect(onToggleSystem).toHaveBeenCalledWith('workstation')
    expect(onStartDateChange).toHaveBeenCalledWith(undefined)
    expect(onEndDateChange).toHaveBeenCalledWith(undefined)
  })
})
