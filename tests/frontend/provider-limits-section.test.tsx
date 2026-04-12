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
          data={[
            {
              date: '2026-04-06',
              inputTokens: 50,
              outputTokens: 25,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              thinkingTokens: 0,
              totalTokens: 75,
              totalCost: 120,
              requestCount: 2,
              modelsUsed: ['claude-sonnet-4-6'],
              modelBreakdowns: [
                {
                  modelName: 'claude-sonnet-4-6',
                  inputTokens: 50,
                  outputTokens: 25,
                  cacheCreationTokens: 0,
                  cacheReadTokens: 0,
                  thinkingTokens: 0,
                  cost: 120,
                  requestCount: 2,
                },
              ],
            },
          ]}
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
          selectedMonth="2026-04"
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('0% Limit')).toBeInTheDocument()
    expect(screen.getByText('240% Abo')).toBeInTheDocument()
    expect(screen.getByText('Offen')).toBeInTheDocument()
  })
})
