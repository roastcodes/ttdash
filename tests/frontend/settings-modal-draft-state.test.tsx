// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { initI18n } from '@/lib/i18n'
import {
  buildSettingsModalProps,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

describe('SettingsModal draft state lifecycle', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('does not overwrite in-progress drafts when parent props change while the dialog stays open', () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderSettingsModal({
      onSaveSettings,
      language: 'de',
      reducedMotionPreference: 'system',
    })

    fireEvent.click(screen.getByTestId('settings-language-en'))
    fireEvent.click(screen.getByTestId('settings-reduced-motion-never'))

    rerender(
      <SettingsModal
        {...buildSettingsModalProps({
          onSaveSettings,
          language: 'de',
          reducedMotionPreference: 'always',
          filterProviders: ['Anthropic'],
          models: ['claude-3-7-sonnet'],
        })}
      />,
    )

    expect(screen.getByTestId('settings-language-en')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('settings-reduced-motion-never')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('re-syncs drafts from props after the dialog closes and opens again', () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined)
    const initialProps = buildSettingsModalProps({
      onSaveSettings,
      language: 'de',
      reducedMotionPreference: 'system',
    })
    const { rerender } = renderSettingsModal(initialProps)

    fireEvent.click(screen.getByTestId('settings-language-en'))
    fireEvent.click(screen.getByTestId('settings-reduced-motion-never'))

    rerender(<SettingsModal {...buildSettingsModalProps({ ...initialProps, open: false })} />)
    rerender(
      <SettingsModal
        {...buildSettingsModalProps({
          onSaveSettings,
          language: 'de',
          reducedMotionPreference: 'always',
          open: true,
        })}
      />,
    )

    expect(screen.getByTestId('settings-language-de')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('settings-reduced-motion-always')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
