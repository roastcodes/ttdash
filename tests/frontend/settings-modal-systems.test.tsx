// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
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
    const onCancelSystemConflicts = vi.fn()
    renderSettingsModal({
      systems,
      systemImportConflicts: ['workstation-b', 'workstation-c'],
      onReplaceSystemConflicts,
      onSkipSystemConflicts,
      onCancelSystemConflicts,
    })
    openSettingsTab('Maintenance')

    const conflictDialog = screen.getByRole('alertdialog')
    expect(conflictDialog).toHaveTextContent('workstation-b, workstation-c')
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    expect(cancelButton).toHaveFocus()
    fireEvent.keyDown(cancelButton, { key: 'Escape' })
    expect(onCancelSystemConflicts).toHaveBeenCalledTimes(1)
    expect(onReplaceSystemConflicts).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }))
    expect(onReplaceSystemConflicts).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Skip all' }))
    expect(onSkipSystemConflicts).toHaveBeenCalledTimes(1)
  })

  it('offers a retry action when a new-system import was interrupted', () => {
    const onRetrySystemImports = vi.fn()
    const onCancelSystemRetries = vi.fn()
    renderSettingsModal({
      systems,
      systemImportRetries: ['workstation-c'],
      onRetrySystemImports,
      onCancelSystemRetries,
    })
    openSettingsTab('Maintenance')

    const retryDialog = screen.getByTestId('system-import-retry-dialog')
    expect(retryDialog).toHaveTextContent('workstation-c')
    expect(within(retryDialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.click(within(retryDialog).getByRole('button', { name: 'Retry imports' }))

    expect(onRetrySystemImports).toHaveBeenCalledTimes(1)
  })

  it('confirms deletion before removing one imported system', () => {
    const onDeleteSystem = vi.fn().mockResolvedValue(undefined)
    renderSettingsModal({ systems, onDeleteSystem })
    openSettingsTab('Maintenance')

    fireEvent.click(screen.getByRole('button', { name: 'Delete system workstation-b' }))
    const confirmation = screen.getByTestId('delete-system-confirmation')
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }))

    expect(onDeleteSystem).toHaveBeenCalledWith('workstation-b')
  })

  it('reports unreadable files and allows deleting the complete imported collection', () => {
    renderSettingsModal({
      systems: systems.slice(0, 1),
      unreadableSystemFiles: [{ filename: 'ttdash-system-corrupted.json', message: 'Unreadable' }],
    })
    openSettingsTab('Maintenance')

    expect(screen.getByText('Unreadable system files')).toBeInTheDocument()
    expect(screen.getByText('ttdash-system-corrupted.json')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete all additional systems' })).toBeEnabled()
  })

  it('disables delete confirmation actions while data mutations are busy', () => {
    const view = renderSettingsModal({ systems })
    openSettingsTab('Maintenance')
    fireEvent.click(screen.getByRole('button', { name: 'Delete system workstation-b' }))
    view.rerenderSettingsModal({ dataBusy: true })

    const confirmation = screen.getByTestId('delete-system-confirmation')
    expect(within(confirmation).getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
