// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HelpPanel } from '@/components/features/help/HelpPanel'
import { initI18n } from '@/lib/i18n'

describe('HelpPanel', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('renders complete human-readable help labels without exposing internal chart keys', () => {
    render(<HelpPanel open onOpenChange={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Charts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dashboard sections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tables' })).toBeInTheDocument()

    expect(screen.getByText('Provider limit usage')).toBeInTheDocument()
    expect(screen.getByText('Provider subscriptions vs. API cost')).toBeInTheDocument()
    expect(screen.getByText('Provider limits over time')).toBeInTheDocument()
    expect(screen.getByText('Cumulative cost per provider')).toBeInTheDocument()

    expect(screen.queryByText('providerLimitProgress')).not.toBeInTheDocument()
    expect(screen.queryByText('providerSubscriptionMix')).not.toBeInTheDocument()
    expect(screen.queryByText('providerLimitTimeline')).not.toBeInTheDocument()
    expect(screen.queryByText('cumulativeCostPerProvider')).not.toBeInTheDocument()
  }, 10_000)

  it('uses consistent German terminology for request and limit surfaces', async () => {
    await initI18n('de')

    render(<HelpPanel open onOpenChange={() => {}} />)

    expect(screen.getByText('Anfragen-Heatmap')).toBeInTheDocument()
    expect(screen.getByText('Anfragequalität')).toBeInTheDocument()
    expect(screen.getByText('Anbieterlimits')).toBeInTheDocument()
    expect(screen.getByText('Limits & Abonnements')).toBeInTheDocument()

    expect(screen.queryByText('Request-Heatmap')).not.toBeInTheDocument()
    expect(screen.queryByText('Request-Qualität')).not.toBeInTheDocument()
    expect(screen.queryByText('Provider Limits')).not.toBeInTheDocument()
    expect(screen.queryByText('Limits & Subscriptions')).not.toBeInTheDocument()
  })
})
