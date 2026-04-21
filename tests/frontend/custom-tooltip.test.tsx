// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { initI18n } from '@/lib/i18n'

describe('CustomTooltip', () => {
  it('localizes the computed total in English', async () => {
    await initI18n('en')

    render(
      <CustomTooltip
        active
        label="2026-04-01"
        payload={[
          { name: 'Model A', value: 6, color: '#f00', dataKey: 'modelA' },
          { name: 'Model B', value: 4, color: '#0f0', dataKey: 'modelB' },
        ]}
      />,
    )

    expect(screen.getByText('Total:')).toBeInTheDocument()
  })

  it('localizes comparison labels in German', async () => {
    await initI18n('de')

    render(
      <CustomTooltip
        active
        label="2026-04-01"
        payload={[
          {
            name: 'Kosten',
            value: 12,
            color: '#f00',
            dataKey: 'cost',
            payload: { costPrev: 10 },
          },
          {
            name: 'Kosten Ø',
            value: 9,
            color: '#f00',
            dataKey: 'costMA7',
          },
        ]}
      />,
    )

    expect(screen.getByText('vs. vorher:')).toBeInTheDocument()
    expect(screen.getByText('vs. Ø:')).toBeInTheDocument()
  })

  it('accepts nullable values and numeric data keys without producing invalid totals', async () => {
    await initI18n('en')

    render(
      <CustomTooltip
        active
        label="2026-04-01"
        payload={[
          { name: 'Model A', value: null, color: '#f00', dataKey: 101 },
          {
            name: 'Model B',
            value: '12.5',
            color: '#0f0',
            dataKey: 'modelB',
            payload: { modelBPrev: '10.5' },
          },
          {
            name: 'Model B Ø',
            value: undefined,
            color: '#0f0',
            dataKey: 'modelBMA7',
          },
        ]}
      />,
    )

    expect(screen.getByText('Model A:')).toBeInTheDocument()
    expect(screen.getByText('Model B:')).toBeInTheDocument()
    expect(screen.getByText('12.5')).toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
    expect(screen.queryByText('Total:')).not.toBeInTheDocument()
  })

  it('uses the single numeric pinned entry as the comparison focus when actual values are non-numeric', async () => {
    await initI18n('en')

    render(
      <CustomTooltip
        active
        label="2026-04-01"
        formatter={(value) => value.toFixed(1)}
        pinnedEntryNames={['Pinned total']}
        payload={[
          {
            name: 'Model A',
            value: null,
            color: '#f00',
            dataKey: 'modelA',
            payload: { pinnedTotalPrev: '10.5' },
          },
          {
            name: 'Pinned total',
            value: '12.5',
            color: '#0f0',
            dataKey: 'pinnedTotal',
            payload: { pinnedTotalPrev: '10.5' },
          },
          {
            name: 'Pinned total Ø',
            value: '11.5',
            color: '#0f0',
            dataKey: 'pinnedtotalMA7',
          },
        ]}
      />,
    )

    expect(screen.getByText('Pinned total:')).toBeInTheDocument()
    expect(screen.getByText('+2.0')).toBeInTheDocument()
    expect(screen.getByText('+1.0')).toBeInTheDocument()
  })
})
