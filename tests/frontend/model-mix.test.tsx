// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { createDailyUsage } from './lazy-dashboard-chart-test-utils'
import { ModelMix } from '@/components/charts/ModelMix'
import { initI18n } from '@/lib/i18n'
import { renderWithTooltip } from '../test-utils'

const modelMixData = [
  createDailyUsage('2026-04-01', { claudeCost: 3, gptCost: 7 }),
  createDailyUsage('2026-04-02', { claudeCost: 5, gptCost: 5 }),
  createDailyUsage('2026-04-03', { claudeCost: 8, gptCost: 2 }),
]

describe('ModelMix chart', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  it('skips underspecified input', () => {
    const { container } = renderWithTooltip(<ModelMix data={modelMixData.slice(0, 2)} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders enough model history', () => {
    renderWithTooltip(<ModelMix data={modelMixData} />)

    expect(screen.getByText('Model mix')).toBeInTheDocument()
    expect(screen.getByText('Cost share by model over time')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-area')).toHaveLength(2)
  })
})
