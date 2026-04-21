// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { initI18n } from '@/lib/i18n'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import {
  buildSettingsModalProps,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

const MOCK_NEWER_VERSION = '2.5.1'

describe('SettingsModal toktrack version status', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('loads and displays the pinned toktrack version state when the dialog opens', async () => {
    const fetchMock = stubToktrackVersionStatus({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: MOCK_NEWER_VERSION,
      isLatest: false,
      lookupStatus: 'ok',
    })

    renderSettingsModal()

    expect(screen.getByTestId('settings-toktrack-version')).toHaveTextContent(TOKTRACK_VERSION)
    expect(await screen.findByTestId('settings-toktrack-status')).toHaveTextContent(
      `Update available: ${MOCK_NEWER_VERSION}`,
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/toktrack/version-status')
  })

  it('only checks the latest toktrack version after the dialog becomes visible', async () => {
    const fetchMock = stubToktrackVersionStatus()
    const { rerender } = renderSettingsModal({ open: false })

    expect(fetchMock).not.toHaveBeenCalled()

    rerender(<SettingsModal {...buildSettingsModalProps({ open: true })} />)

    expect(await screen.findByTestId('settings-toktrack-status')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows a warning when the latest toktrack version check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    renderSettingsModal()

    expect(await screen.findByTestId('settings-toktrack-status')).toHaveTextContent(
      'Latest version could not be checked',
    )
  }, 10_000)
})
