// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { ToastProvider } from '@/components/ui/toast'
import {
  openSettingsTab,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

describe('SettingsModal tab navigation', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('opens on the basics tab and keeps the dialog title focus behavior', () => {
    renderSettingsModal()

    expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Basics/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-language-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-motion-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-defaults-section')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-sections-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-backups-section')).not.toBeInTheDocument()
  })

  it('groups settings by user intent across the tab panels', () => {
    renderSettingsModal({ limitProviders: ['OpenAI'], hasData: true })

    openSettingsTab(/Layout/)
    expect(screen.getByRole('tab', { name: /Layout/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-sections-section')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-language-section')).not.toBeInTheDocument()

    openSettingsTab(/Limits/)
    expect(screen.getByRole('tab', { name: /Limits/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-provider-limits-section')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-sections-section')).not.toBeInTheDocument()

    openSettingsTab(/Maintenance/)
    expect(screen.getByRole('tab', { name: /Maintenance/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('settings-status-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-backups-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-toktrack-section')).toBeInTheDocument()
  })

  it('supports keyboard navigation between settings tabs', () => {
    renderSettingsModal()

    const basicsTab = screen.getByRole('tab', { name: /Basics/ })
    basicsTab.focus()

    fireEvent.keyDown(basicsTab, { key: 'ArrowRight' })
    const layoutTab = screen.getByRole('tab', { name: /Layout/ })
    expect(layoutTab).toHaveFocus()
    expect(layoutTab).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(layoutTab, { key: 'End' })
    const maintenanceTab = screen.getByRole('tab', { name: /Maintenance/ })
    expect(maintenanceTab).toHaveFocus()
    expect(maintenanceTab).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(maintenanceTab, { key: 'Home' })
    expect(basicsTab).toHaveFocus()
    expect(basicsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('resets to the basics tab while closed so the next open starts predictably', () => {
    const { props, rerender } = renderSettingsModal()

    openSettingsTab(/Maintenance/)
    expect(screen.getByRole('tab', { name: /Maintenance/ })).toHaveAttribute(
      'aria-selected',
      'true',
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

    expect(screen.getByRole('tab', { name: /Basics/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByTestId('settings-status-section')).not.toBeInTheDocument()
  })
})
