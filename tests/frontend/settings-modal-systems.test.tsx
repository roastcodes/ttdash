// @vitest-environment jsdom

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { dashboardFixture } from '../fixtures/usage-data'
import {
  openSettingsTab,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

const totals = {
  inputTokens: 180,
  outputTokens: 90,
  cacheCreationTokens: 30,
  cacheReadTokens: 40,
  thinkingTokens: 10,
  totalTokens: 350,
  totalCost: 10,
  requestCount: 5,
}

const systems = [
  {
    id: 'workstation-a',
    hostname: 'workstation-a',
    isLocal: true,
    exportedAt: null,
    data: { daily: [dashboardFixture[0]!], totals },
  },
  {
    id: 'workstation-b',
    hostname: 'workstation-b',
    isLocal: false,
    exportedAt: '2026-08-18T08:00:00.000Z',
    data: { daily: [dashboardFixture[0]!], totals },
  },
]

describe('SettingsModal system transfer actions', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('exports local data, opens the multi-file importer, and lists imported systems', () => {
    const onExportSystem = vi.fn()
    const onImportSystems = vi.fn()
    renderSettingsModal({ systems, hasData: true, onExportSystem, onImportSystems })
    openSettingsTab('Maintenance')

    fireEvent.click(screen.getByRole('button', { name: 'Export this system' }))
    fireEvent.click(screen.getByRole('button', { name: 'Import system files' }))

    expect(onExportSystem).toHaveBeenCalledTimes(1)
    expect(onImportSystems).toHaveBeenCalledTimes(1)
    expect(screen.getByText('workstation-b')).toBeInTheDocument()
  })

  it('offers one replace-or-skip decision for all import conflicts', () => {
    const onReplaceSystemConflicts = vi.fn()
    const onSkipSystemConflicts = vi.fn()
    renderSettingsModal({
      systems,
      systemImportConflicts: ['workstation-b', 'workstation-c'],
      onReplaceSystemConflicts,
      onSkipSystemConflicts,
    })
    openSettingsTab('Maintenance')

    expect(screen.getByRole('alertdialog')).toHaveTextContent('workstation-b, workstation-c')
    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }))
    expect(onReplaceSystemConflicts).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Skip all' }))
    expect(onSkipSystemConflicts).toHaveBeenCalledTimes(1)
  })

  it('confirms deletion before removing one imported system', async () => {
    const onDeleteSystem = vi.fn().mockResolvedValue(undefined)
    renderSettingsModal({ systems, onDeleteSystem })
    openSettingsTab('Maintenance')

    fireEvent.click(screen.getByRole('button', { name: 'Delete system workstation-b' }))
    const confirmation = screen.getByTestId('delete-system-confirmation')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDeleteSystem).toHaveBeenCalledWith('workstation-b'))
  })
})
