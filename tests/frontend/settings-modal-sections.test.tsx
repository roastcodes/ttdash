// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import {
  openSettingsTab,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

describe('SettingsModal sections controls', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('saves the edited section order and visibility', () => {
    const { onSaveSettings } = renderSettingsModal()
    openSettingsTab('Layout')
    const expectedSectionOrder = [...DEFAULT_APP_SETTINGS.sectionOrder]
    const metricsIndex = expectedSectionOrder.indexOf('metrics')
    const nextSection = expectedSectionOrder[metricsIndex + 1]

    expect(metricsIndex).toBeGreaterThanOrEqual(0)
    expect(nextSection).toBeDefined()

    if (metricsIndex >= 0 && nextSection) {
      expectedSectionOrder.splice(metricsIndex, 2, nextSection, 'metrics')
    }

    fireEvent.click(screen.getByTestId('move-section-down-metrics'))
    fireEvent.click(screen.getByTestId('toggle-section-visibility-metrics'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionOrder: expectedSectionOrder,
        sectionVisibility: {
          ...DEFAULT_APP_SETTINGS.sectionVisibility,
          metrics: false,
        },
      }),
    )
  })

  it('restores the default section layout when reset is pressed', () => {
    const { onSaveSettings } = renderSettingsModal({
      sectionVisibility: {
        ...DEFAULT_APP_SETTINGS.sectionVisibility,
        metrics: false,
        tables: false,
      },
      sectionOrder: [...DEFAULT_APP_SETTINGS.sectionOrder].reverse(),
    })
    openSettingsTab('Layout')

    fireEvent.click(screen.getByTestId('reset-section-visibility'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionOrder: DEFAULT_APP_SETTINGS.sectionOrder,
        sectionVisibility: DEFAULT_APP_SETTINGS.sectionVisibility,
      }),
    )
  })
})
