// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

function renderSettingsModal({
  reducedMotionPreference = 'system',
  onSaveSettings = vi.fn().mockResolvedValue(undefined),
}: {
  reducedMotionPreference?: 'system' | 'always' | 'never'
  onSaveSettings?: ReturnType<typeof vi.fn>
} = {}) {
  render(
    <TooltipProvider>
      <SettingsModal
        open={true}
        onOpenChange={vi.fn()}
        language="de"
        reducedMotionPreference={reducedMotionPreference}
        limitProviders={[]}
        filterProviders={[]}
        models={[]}
        limits={{}}
        defaultFilters={{ viewMode: 'daily', datePreset: 'all', providers: [], models: [] }}
        sectionVisibility={{
          insights: true,
          metrics: true,
          today: true,
          currentMonth: true,
          activity: true,
          forecastCache: true,
          limits: true,
          costAnalysis: true,
          tokenAnalysis: true,
          requestAnalysis: true,
          advancedAnalysis: true,
          comparisons: true,
          tables: true,
        }}
        sectionOrder={[
          'insights',
          'metrics',
          'today',
          'currentMonth',
          'activity',
          'forecastCache',
          'limits',
          'costAnalysis',
          'tokenAnalysis',
          'requestAnalysis',
          'advancedAnalysis',
          'comparisons',
          'tables',
        ]}
        lastLoadedAt={null}
        lastLoadSource={null}
        cliAutoLoadActive={false}
        hasData={false}
        onSaveSettings={onSaveSettings}
        onExportSettings={vi.fn()}
        onImportSettings={vi.fn()}
        onExportData={vi.fn()}
        onImportData={vi.fn()}
      />
    </TooltipProvider>,
  )

  return { onSaveSettings }
}

describe('SettingsModal', () => {
  beforeEach(async () => {
    await initI18n('en')
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
})
