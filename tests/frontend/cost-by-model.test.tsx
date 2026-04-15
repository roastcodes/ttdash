// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CostByModel } from '@/components/charts/CostByModel'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

describe('CostByModel', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )

    await initI18n('en')
  })

  it('renders a readable share breakdown for the leading slices without relying on hover', () => {
    render(
      <TooltipProvider>
        <CostByModel
          data={[
            { name: 'GPT-5.4', value: 60 },
            { name: 'Claude Sonnet 4.5', value: 25 },
            { name: 'Gemini 2.5 Pro', value: 10 },
            { name: 'Grok 4', value: 5 },
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('GPT-5.4 · 60%')).toBeInTheDocument()
    expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument()
    expect(screen.getByText(/25% · \$25(?:\.0+)?/)).toBeInTheDocument()
    expect(screen.getByText('Other models')).toBeInTheDocument()
    expect(screen.getByText('5% · $5.00')).toBeInTheDocument()
  })
})
