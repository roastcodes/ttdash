import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'

const apiMocks = vi.hoisted(() => ({
  fetchSettings: vi.fn(),
  isRemoteAuthenticationRequired: vi.fn(),
  onRemoteAuthenticationRequired: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)
vi.mock('@/components/Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }))
vi.mock('@/components/features/remote-login/RemoteLogin', () => ({
  RemoteLogin: () => <div>Remote login</div>,
}))

describe('App remote authentication', () => {
  beforeEach(() => {
    apiMocks.fetchSettings.mockReset()
    apiMocks.isRemoteAuthenticationRequired.mockReset()
    apiMocks.onRemoteAuthenticationRequired.mockReset()
    apiMocks.isRemoteAuthenticationRequired.mockReturnValue(true)
    apiMocks.onRemoteAuthenticationRequired.mockReturnValue(vi.fn())
  })

  it('renders login when a remote 401 occurred before the app subscribed', () => {
    render(<App initialSettings={DEFAULT_APP_SETTINGS} />)

    expect(screen.getByText('Remote login')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
