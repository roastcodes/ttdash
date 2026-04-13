// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { FormattedValue } from '@/components/ui/formatted-value'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatCurrencyExact } from '@/lib/formatters'
import { initI18n } from '@/lib/i18n'

describe('FormattedValue', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('renders abbreviated values as focusable tooltip triggers with the exact value', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <FormattedValue
          value={5046.25}
          type="currency"
          label="Total cost"
          insight="Average spend per active day"
        />
      </TooltipProvider>,
    )

    const trigger = screen.getByRole('button', {
      name: `Total cost: ${formatCurrencyExact(5046.25)}`,
    })

    fireEvent.focus(trigger)

    expect(await screen.findAllByText(formatCurrencyExact(5046.25))).toHaveLength(2)
    expect(screen.getAllByText('Average spend per active day')).toHaveLength(2)
  })

  it('keeps non-abbreviated values static', () => {
    render(
      <TooltipProvider delayDuration={0}>
        <FormattedValue value={5} type="number" />
      </TooltipProvider>,
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a non-interactive exact-value fallback inside clickable containers', () => {
    render(
      <button type="button">
        <FormattedValue value={5046.25} type="currency" interactive={false} />
      </button>,
    )

    const value = screen.getByText('$5.0k')
    const wrapper = value.closest('[title]')

    expect(value.tagName).toBe('SPAN')
    expect(value.querySelector('button')).toBeNull()
    expect(wrapper).toHaveAttribute('title', '$5,046.25')
  })
})
