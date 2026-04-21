// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { initI18n } from '@/lib/i18n'
import { renderSettingsModal, stubToktrackVersionStatus } from './settings-modal-test-helpers'

describe('SettingsModal language and motion settings', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('exposes language controls and saves the selected language', async () => {
    const { onSaveSettings } = renderSettingsModal()

    expect(screen.getByText('Dashboard language')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Settings')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-reduced-motion-system')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByTestId('settings-language-en'))
    fireEvent.click(screen.getByTestId('settings-reduced-motion-never'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'en',
        reducedMotionPreference: 'never',
      }),
    )
  }, 10_000)

  it('resets the reduced-motion override back to browser settings', () => {
    const { onSaveSettings } = renderSettingsModal({
      reducedMotionPreference: 'always',
    })

    expect(screen.getByTestId('settings-reduced-motion-always')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByTestId('settings-reduced-motion-never'))
    fireEvent.click(screen.getByTestId('reset-all-settings-drafts'))
    expect(screen.getByTestId('settings-reduced-motion-system')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        reducedMotionPreference: 'system',
      }),
    )
  })

  it('renders natural German labels for the dashboard motion settings', async () => {
    await initI18n('de')
    renderSettingsModal({
      language: 'de',
      reducedMotionPreference: 'always',
    })

    expect(screen.getByText('Dashboard-Einstellungen')).toBeInTheDocument()
    expect(screen.getByText(/Browsereinstellung/)).toBeInTheDocument()
    expect(screen.getByText(/Toast-Benachrichtigungen/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Immer' })).toHaveAttribute('aria-pressed', 'true')

    await initI18n('en')
  })
})
