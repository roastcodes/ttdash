// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_LIMIT_CONFIG } from '@/lib/provider-limits'
import { initI18n } from '@/lib/i18n'
import { renderSettingsModal, stubToktrackVersionStatus } from './settings-modal-test-helpers'

describe('SettingsModal provider limits', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    stubToktrackVersionStatus()
  })

  it('preserves a full provider config when toggling a subscription from an empty draft', () => {
    const { onSaveSettings } = renderSettingsModal({
      limitProviders: ['OpenAI'],
      limits: {},
    })

    const providerCard = screen
      .getByTestId('settings-provider-subscription-OpenAI')
      .closest('[data-provider-id="OpenAI"]')

    expect(providerCard).not.toBeNull()

    const [subscriptionInput] = within(providerCard as HTMLElement).getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]

    expect(subscriptionInput).toBeDisabled()

    fireEvent.click(screen.getByTestId('settings-provider-subscription-OpenAI'))

    const [updatedSubscriptionInput, updatedMonthlyLimitInput] = within(
      providerCard as HTMLElement,
    ).getAllByRole('spinbutton') as HTMLInputElement[]

    expect(updatedSubscriptionInput).toBeEnabled()

    fireEvent.change(updatedSubscriptionInput, { target: { value: '5.2' } })
    fireEvent.change(updatedMonthlyLimitInput, { target: { value: '12.345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        providerLimits: {
          OpenAI: {
            hasSubscription: true,
            subscriptionPrice: 5.2,
            monthlyLimit: 12.35,
          },
        },
      }),
    )
  })

  it('resets provider limits back to the per-provider defaults', () => {
    const { onSaveSettings } = renderSettingsModal({
      limitProviders: ['OpenAI', 'Anthropic'],
      limits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 20,
          monthlyLimit: 100,
        },
        Anthropic: {
          hasSubscription: true,
          subscriptionPrice: 35,
          monthlyLimit: 140,
        },
      },
    })

    fireEvent.click(screen.getByTestId('reset-provider-limits'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        providerLimits: {
          OpenAI: { ...DEFAULT_PROVIDER_LIMIT_CONFIG },
          Anthropic: { ...DEFAULT_PROVIDER_LIMIT_CONFIG },
        },
      }),
    )
  })
})
