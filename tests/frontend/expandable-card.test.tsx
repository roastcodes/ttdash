// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ExpandableCard } from '@/components/ui/expandable-card'
import { initI18n } from '@/lib/i18n'

describe('ExpandableCard', () => {
  beforeEach(async () => {
    await initI18n('de')
  })

  it('uses a focus-revealed expand control and localized dialog description', () => {
    render(
      <ExpandableCard title="Forecast">
        <div>Inhalt</div>
      </ExpandableCard>,
    )

    const button = screen.getByRole('button', { name: 'Forecast vergrössern' })
    expect(button).toHaveClass('opacity-100')
    expect(button).toHaveClass('md:group-focus-within:opacity-100')
    expect(button).toHaveClass('motion-reduce:transition-none')

    fireEvent.click(button)

    expect(
      screen.getByText(
        'Erweiterte Kartenansicht mit zusätzlichen Kennzahlen und vollständigem Inhalt.',
      ),
    ).toBeInTheDocument()
  })
})
