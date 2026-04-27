// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { ToastProvider } from '@/components/ui/toast'
import { initI18n } from '@/lib/i18n'
import { warmupToktrackVersionStatus } from '@/lib/toktrack-version-status'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import {
  buildSettingsModalProps,
  openSettingsTab,
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

  it('displays the warmed toktrack version state without fetching on dialog open', async () => {
    const fetchMock = stubToktrackVersionStatus({
      configuredVersion: TOKTRACK_VERSION,
      latestVersion: MOCK_NEWER_VERSION,
      isLatest: false,
      lookupStatus: 'ok',
    })

    await warmupToktrackVersionStatus()
    renderSettingsModal()
    openSettingsTab('Maintenance')

    expect(screen.getByTestId('settings-toktrack-version')).toHaveTextContent(TOKTRACK_VERSION)
    expect(screen.getByTestId('settings-toktrack-status')).toHaveTextContent(
      `Update available: ${MOCK_NEWER_VERSION}`,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not start the latest-version check when the dialog becomes visible', () => {
    const fetchMock = stubToktrackVersionStatus()
    const { rerender } = renderSettingsModal({ open: false })

    expect(fetchMock).not.toHaveBeenCalled()

    rerender(
      <ToastProvider>
        <SettingsModal {...buildSettingsModalProps({ open: true })} />
      </ToastProvider>,
    )
    openSettingsTab('Maintenance')

    expect(screen.getByTestId('settings-toktrack-status')).toHaveTextContent('Checking latest')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a cached warning when the session latest-version check fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'))
    vi.stubGlobal('fetch', fetchMock)

    await warmupToktrackVersionStatus()
    const { props, rerender } = renderSettingsModal()
    openSettingsTab('Maintenance')

    expect(screen.getByTestId('settings-toktrack-status')).toHaveTextContent(
      'Latest version could not be checked',
    )

    rerender(
      <ToastProvider>
        <SettingsModal {...props} open={false} />
      </ToastProvider>,
    )
    rerender(
      <ToastProvider>
        <SettingsModal {...props} open />
      </ToastProvider>,
    )
    openSettingsTab('Maintenance')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
