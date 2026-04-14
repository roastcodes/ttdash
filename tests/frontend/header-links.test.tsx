// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
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
      helpPanel={<HelpPanel open={helpOpen} onOpenChange={setHelpOpen} />}
    />
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
})
