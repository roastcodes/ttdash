// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from '@/components/Dashboard'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import { createDashboardControllerViewModel } from './dashboard-controller-test-helpers'

const dashboardControllerMocks = vi.hoisted(() => ({
  useDashboardControllerWithBootstrap: vi.fn(),
}))

vi.mock('@/hooks/use-dashboard-controller', () => dashboardControllerMocks)
vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}))
vi.mock('@/components/layout/FilterBar', () => ({
  FilterBar: ({ allModels, selectedModels }: { allModels: string[]; selectedModels: string[] }) => (
    <div data-testid="filter-bar-props">
      {JSON.stringify({
        allModels,
        selectedModels,
      })}
    </div>
  ),
}))
vi.mock('@/components/dashboard/DashboardSections', () => ({
  DashboardSections: ({
    viewModel,
  }: {
    viewModel: {
      layout: { sectionOrder: string[] }
      interactions: { onDrillDownDateChange: (date: string | null) => void }
    }
  }) => (
    <div data-testid="dashboard-sections-props">
      {JSON.stringify({
        sectionOrder: viewModel.layout.sectionOrder,
        hasDrillDownHandler: typeof viewModel.interactions.onDrillDownDateChange === 'function',
      })}
    </div>
  ),
}))
vi.mock('@/components/features/command-palette/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}))
vi.mock('@/components/features/pdf-report/PDFReport', () => ({
  PDFReportButton: () => <div data-testid="pdf-report-button" />,
}))

describe('Dashboard model filter visibility', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('keeps selected models visible in the FilterBar when they are filtered out of availableModels', () => {
    dashboardControllerMocks.useDashboardControllerWithBootstrap.mockReturnValue(
      createDashboardControllerViewModel(),
    )

    render(<Dashboard initialSettings={DEFAULT_APP_SETTINGS} />)

    const props = JSON.parse(screen.getByTestId('filter-bar-props').textContent ?? '{}') as {
      allModels: string[]
      selectedModels: string[]
    }

    expect(props.selectedModels).toEqual(['GPT-5.4'])
    expect(props.allModels).toEqual(['Claude Sonnet 4.5', 'GPT-5.4'])
  })

  it('passes dashboard sections through one structured view model bundle', () => {
    dashboardControllerMocks.useDashboardControllerWithBootstrap.mockReturnValue(
      createDashboardControllerViewModel(),
    )

    render(<Dashboard initialSettings={DEFAULT_APP_SETTINGS} />)

    const props = JSON.parse(
      screen.getByTestId('dashboard-sections-props').textContent ?? '{}',
    ) as {
      sectionOrder: string[]
      hasDrillDownHandler: boolean
    }

    expect(props.sectionOrder).toEqual(DEFAULT_APP_SETTINGS.sectionOrder)
    expect(props.hasDrillDownHandler).toBe(true)
  })
})
