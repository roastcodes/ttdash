// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderLimitsSection } from '@/components/features/limits/ProviderLimitsSection'
import { initI18n } from '@/lib/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'

describe('ProviderLimitsSection', () => {
  beforeEach(async () => {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await initI18n('de')
  })

  it('renders the limit badge for limit, subscription, and open states', () => {
    render(
      <TooltipProvider>
        <ProviderLimitsSection
          data={[]}
          providers={['OpenAI', 'Anthropic', 'OpenCode']}
          limits={{
            OpenAI: {
              hasSubscription: false,
              subscriptionPrice: 0,
              monthlyLimit: 100,
            },
            Anthropic: {
              hasSubscription: true,
              subscriptionPrice: 50,
              monthlyLimit: 0,
            },
            OpenCode: {
              hasSubscription: false,
              subscriptionPrice: 0,
              monthlyLimit: 0,
            },
          }}
          selectedMonth={null}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('0% Limit')).toBeInTheDocument()
    expect(screen.getByText('0% Sub')).toBeInTheDocument()
    expect(screen.getByText('Offen')).toBeInTheDocument()
  })
})
