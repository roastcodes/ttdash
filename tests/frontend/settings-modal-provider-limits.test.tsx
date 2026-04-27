// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROVIDER_LIMIT_CONFIG } from '@/lib/provider-limits'
import { initI18n } from '@/lib/i18n'
import {
  openSettingsTab,
  renderSettingsModal,
  stubToktrackVersionStatus,
} from './settings-modal-test-helpers'

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
    openSettingsTab('Limits')

    const providerCard = screen
      .getByTestId('settings-provider-subscription-OpenAI')
      .closest('[data-provider-id="OpenAI"]')

    expect(providerCard).not.toBeNull()

    const [subscriptionInput] = within(providerCard as HTMLElement).getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]

    expect(subscriptionInput).toBeDisabled()

    fireEvent.click(screen.getByTestId('settings-provider-subscription-OpenAI'))

    const [updatedSubscriptionInput, updatedMonthlyLimitInput] = Array.from(
      (providerCard as HTMLElement).querySelectorAll('input'),
    ) as HTMLInputElement[]

    expect(updatedSubscriptionInput).toBeEnabled()

    fireEvent.change(updatedSubscriptionInput, { target: { value: '5.2' } })
    fireEvent.blur(updatedSubscriptionInput)
    fireEvent.change(updatedMonthlyLimitInput, { target: { value: '12.345' } })
    fireEvent.blur(updatedMonthlyLimitInput)
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

  it('keeps subscription price typing local until blur commits the rounded value', () => {
    renderSettingsModal({
      limitProviders: ['OpenAI'],
      limits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 5,
          monthlyLimit: 0,
        },
      },
    })
    openSettingsTab('Limits')

    const providerCard = screen
      .getByTestId('settings-provider-subscription-OpenAI')
      .closest('[data-provider-id="OpenAI"]')
    expect(providerCard).not.toBeNull()

    const [subscriptionInput] = within(providerCard as HTMLElement).getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]

    fireEvent.change(subscriptionInput, { target: { value: '1.234' } })
    expect(subscriptionInput.value).toBe('1.234')

    fireEvent.blur(subscriptionInput)
    expect(subscriptionInput.value).toBe('1.23')
  })

  it('keeps monthly limit typing local until blur commits the rounded value', () => {
    renderSettingsModal({
      limitProviders: ['OpenAI'],
      limits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 5,
          monthlyLimit: 10,
        },
      },
    })
    openSettingsTab('Limits')

    const providerCard = screen
      .getByTestId('settings-provider-subscription-OpenAI')
      .closest('[data-provider-id="OpenAI"]')
    expect(providerCard).not.toBeNull()

    const [, monthlyLimitInput] = Array.from(
      (providerCard as HTMLElement).querySelectorAll('input'),
    ) as HTMLInputElement[]

    fireEvent.change(monthlyLimitInput, { target: { value: '12.' } })
    expect(monthlyLimitInput.value).toBe('12.')

    fireEvent.change(monthlyLimitInput, { target: { value: '12.345' } })
    expect(monthlyLimitInput.value).toBe('12.345')

    fireEvent.blur(monthlyLimitInput)
    expect(monthlyLimitInput.value).toBe('12.35')
  })

  it('disables provider limit mutations while settings are busy', () => {
    renderSettingsModal({
      settingsBusy: true,
      limitProviders: ['OpenAI'],
      limits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 5,
          monthlyLimit: 10,
        },
      },
    })
    openSettingsTab('Limits')

    const providerCard = screen
      .getByTestId('settings-provider-subscription-OpenAI')
      .closest('[data-provider-id="OpenAI"]')
    expect(providerCard).not.toBeNull()

    const inputs = Array.from((providerCard as HTMLElement).querySelectorAll('input'))

    expect(screen.getByTestId('settings-provider-subscription-OpenAI')).toBeDisabled()
    expect(inputs[0]).toBeDisabled()
    expect(inputs[1]).toBeDisabled()
    expect(screen.getByTestId('reset-provider-limits')).toBeDisabled()
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
    openSettingsTab('Limits')

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
