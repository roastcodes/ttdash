// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HelpPanel } from '@/components/features/help/HelpPanel'
import { Header } from '@/components/layout/Header'
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL, NPM_PACKAGE_URL, VERSION } from '@/lib/constants'
import { initI18n } from '@/lib/i18n'

function HeaderTestHarness() {
  const [helpOpen, setHelpOpen] = useState(false)
  const noop = () => {}

  return (
    <>
      <Header
        dateRange={null}
        isDark={true}
        currentLanguage="en"
        onHelpOpenChange={setHelpOpen}
        onLanguageChange={noop}
        onToggleTheme={noop}
        onExportCSV={noop}
        onDelete={noop}
        onUpload={noop}
        onAutoImport={noop}
        settingsButton={<button type="button">Settings</button>}
        pdfButton={<button type="button">Report</button>}
      />
      <HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}

describe('Header external links', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('links the header version to the current npm package version', () => {
    render(<HeaderTestHarness />)

    const versionLink = screen.getByRole('link', {
      name: `Open TTDash v${VERSION} on npm`,
    })

    expect(versionLink).toHaveAttribute('href', NPM_PACKAGE_URL)
    expect(versionLink).toHaveAttribute('target', '_blank')
    expect(versionLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows npm, GitHub, and GitHub issues links in the help panel', () => {
    render(<HeaderTestHarness />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Help & shortcuts' })[0])

    expect(screen.getByRole('link', { name: 'npm' })).toHaveAttribute('href', NPM_PACKAGE_URL)
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', GITHUB_REPO_URL)
    expect(screen.getByRole('link', { name: 'GitHub Issues' })).toHaveAttribute(
      'href',
      GITHUB_ISSUES_URL,
    )
  })

  it('labels the shared dialog close button accessibly', () => {
    render(<HeaderTestHarness />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Help & shortcuts' })[0])

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('exposes accessible names and pressed state for header controls', () => {
    render(<HeaderTestHarness />)

    const helpButtons = screen.getAllByRole('button', { name: 'Help & shortcuts' })
    expect(helpButtons.length).toBeGreaterThan(0)

    expect(screen.getAllByRole('button', { name: 'Enable light mode' }).length).toBeGreaterThan(0)

    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'DE' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('groups header actions by user intent and localizes the group labels', async () => {
    const currentLanguage = document.documentElement.lang

    try {
      const { unmount } = render(<HeaderTestHarness />)

      const loadDataGroup = screen.getByRole('group', { name: 'Load data' })
      expect(within(loadDataGroup).getByRole('button', { name: 'Import' })).toBeInTheDocument()
      expect(within(loadDataGroup).getByRole('button', { name: 'Upload' })).toBeInTheDocument()

      const useExportGroup = screen.getByRole('group', { name: 'Use & export' })
      expect(within(useExportGroup).getByRole('button', { name: 'Settings' })).toBeInTheDocument()
      expect(within(useExportGroup).getByRole('button', { name: 'Report' })).toBeInTheDocument()
      expect(within(useExportGroup).getByRole('button', { name: 'CSV' })).toBeInTheDocument()

      const maintenanceGroup = screen.getByRole('group', { name: 'Maintenance' })
      expect(within(maintenanceGroup).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

      unmount()
      await initI18n('de')
      render(<HeaderTestHarness />)

      expect(screen.getByRole('group', { name: 'Daten laden' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Nutzen & exportieren' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Wartung' })).toBeInTheDocument()
    } finally {
      await initI18n(currentLanguage || 'en')
    }
  })
})
