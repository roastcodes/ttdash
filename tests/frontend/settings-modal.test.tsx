// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

describe('SettingsModal', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('exposes language controls and saves the selected language', async () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined)

    render(
      <TooltipProvider>
        <SettingsModal
          open={true}
          onOpenChange={vi.fn()}
          language="de"
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

    expect(screen.getByText('Dashboard language')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-language-en'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'en',
      }),
    )
  }, 10_000)
})
