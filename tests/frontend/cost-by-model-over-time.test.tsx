// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CostByModelOverTime } from '@/components/charts/CostByModelOverTime'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

describe('CostByModelOverTime', () => {
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

  it('ignores non-finite series values when computing the top model summary', () => {
    render(
      <TooltipProvider>
        <CostByModelOverTime
          models={['GPT-5.4', 'Sonnet 4.6']}
          data={[
            {
              date: '2026-04-01',
              cost: 5,
              'GPT-5.4': 5,
              'Sonnet 4.6': Number.NaN,
            },
            {
              date: '2026-04-02',
              cost: 4,
              'GPT-5.4': 4,
              'Sonnet 4.6': Number.POSITIVE_INFINITY,
            },
          ]}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText(/gpt-5\.4/i)).toBeInTheDocument()
    expect(screen.getByText(/\$9\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/infinity/i)).not.toBeInTheDocument()
  })
})
