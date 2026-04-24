// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { renderSettingsModal, stubToktrackVersionStatus } from './settings-modal-test-helpers'

describe('SettingsModal backup actions', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('routes the backup actions to the provided callbacks', () => {
    const onExportSettings = vi.fn()
    const onImportSettings = vi.fn()
    const onExportData = vi.fn()
    const onImportData = vi.fn()

    renderSettingsModal({
      hasData: true,
      onExportSettings,
      onImportSettings,
      onExportData,
      onImportData,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Import settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Import data' }))

    expect(onExportSettings).toHaveBeenCalledTimes(1)
    expect(onImportSettings).toHaveBeenCalledTimes(1)
    expect(onExportData).toHaveBeenCalledTimes(1)
    expect(onImportData).toHaveBeenCalledTimes(1)
  })

  it('disables backup actions according to busy and data availability state', () => {
    renderSettingsModal({
      hasData: false,
      settingsBusy: true,
      dataBusy: true,
    })

    expect(screen.getByRole('button', { name: 'Export settings' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Import settings' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export data' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Import data' })).toBeDisabled()
  })
})
