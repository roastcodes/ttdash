// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ModelEfficiency } from '@/components/tables/ModelEfficiency'
import { ProviderEfficiency } from '@/components/tables/ProviderEfficiency'
import { initI18n } from '@/lib/i18n'
import type { AggregateMetrics, ViewMode } from '@/types'

describe('German analysis terminology', () => {
  beforeEach(async () => {
    globalThis.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof IntersectionObserver
    await initI18n('de')
  })

  it('uses localized request and provider terminology in deeper analysis tables', () => {
    const modelCosts = new Map([
      [
        'gpt-5.4',
        {
          cost: 12.5,
          tokens: 12_000,
          input: 4_000,
          output: 6_000,
          cacheRead: 1_500,
          cacheCreate: 300,
          thinking: 200,
          days: 3,
          requests: 5,
        },
      ],
    ])

    const providerMetrics = new Map<string, AggregateMetrics>([
      [
        'OpenAI',
        {
          cost: 12.5,
          tokens: 12_000,
          input: 4_000,
          output: 6_000,
          cacheRead: 1_500,
          cacheCreate: 300,
          thinking: 200,
          requests: 5,
          days: 3,
        },
      ],
    ])

    render(
      <TooltipProvider delayDuration={0}>
        <div>
          <ModelEfficiency
            modelCosts={modelCosts}
            totalCost={12.5}
            viewMode={'daily' as ViewMode}
          />
          <ProviderEfficiency
            providerMetrics={providerMetrics}
            totalCost={12.5}
            viewMode={'daily' as ViewMode}
          />
        </div>
      </TooltipProvider>,
    )

    expect(screen.getByText('Anbieter-Effizienz')).toBeInTheDocument()
    expect(screen.getAllByText('Kosten / Anfrage').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tokens / Anfrage').length).toBeGreaterThan(0)

    expect(screen.queryByText('Provider-Effizienz')).not.toBeInTheDocument()
    expect(screen.queryByText('$/Req')).not.toBeInTheDocument()
    expect(screen.queryByText('Tokens/Req')).not.toBeInTheDocument()
  })
})
