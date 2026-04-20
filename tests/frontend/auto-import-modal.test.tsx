// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoImportModal } from '@/components/features/auto-import/AutoImportModal'
import { initI18n } from '@/lib/i18n'

const autoImportMocks = vi.hoisted(() => ({
  startAutoImport: vi.fn(),
}))

vi.mock('@/lib/auto-import', () => autoImportMocks)

describe('AutoImportModal', () => {
  beforeEach(async () => {
    await initI18n('en')
    autoImportMocks.startAutoImport.mockReset()
  })

  it('offers an explicit cancel action while the import is still running', () => {
    const closeMock = vi.fn()
    const onOpenChange = vi.fn()

    autoImportMocks.startAutoImport.mockReturnValue({
      close: closeMock,
    })

    render(<AutoImportModal open={true} onOpenChange={onOpenChange} onSuccess={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(closeMock).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the concrete auto-import error message in the status area', () => {
    autoImportMocks.startAutoImport.mockImplementation((callbacks) => {
      callbacks.onError({
        message: 'Toktrack returned invalid JSON output: Unexpected end of JSON input',
      })
      callbacks.onDone()

      return {
        close: vi.fn(),
      }
    })

    render(<AutoImportModal open={true} onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    expect(
      screen.getAllByText('Toktrack returned invalid JSON output: Unexpected end of JSON input'),
    ).toHaveLength(2)
  })
})
