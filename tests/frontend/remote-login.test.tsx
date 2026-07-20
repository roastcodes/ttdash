import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteLogin } from '@/components/features/remote-login/RemoteLogin'
import { initI18n } from '@/lib/i18n'

const apiMocks = vi.hoisted(() => ({
  authenticateRemoteSession: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)

describe('remote login', () => {
  beforeEach(async () => {
    apiMocks.authenticateRemoteSession.mockReset()
    await initI18n('en')
  })

  it('submits the token without displaying it and reports authentication errors', async () => {
    apiMocks.authenticateRemoteSession.mockRejectedValue(new Error('Authentication required'))
    render(<RemoteLogin />)

    const input = screen.getByLabelText('Remote token')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.change(input, { target: { value: 'remote-secret-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await act(async () => Promise.resolve())

    expect(apiMocks.authenticateRemoteSession).toHaveBeenCalledWith('remote-secret-token')
    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required')
  })

  it('continues after a successful browser-session exchange', async () => {
    const onAuthenticated = vi.fn()
    apiMocks.authenticateRemoteSession.mockResolvedValue(undefined)
    render(<RemoteLogin onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText('Remote token'), {
      target: { value: 'remote-secret-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await act(async () => Promise.resolve())

    expect(onAuthenticated).toHaveBeenCalledOnce()
    expect(apiMocks.authenticateRemoteSession).toHaveBeenCalledWith('remote-secret-token')
  })
})
