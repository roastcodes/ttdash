// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initI18n } from '@/lib/i18n'

function renderSettingsModal({
  open = true,
  reducedMotionPreference = 'system',
  onSaveSettings = vi.fn().mockResolvedValue(undefined),
}: {
  open?: boolean
  reducedMotionPreference?: 'system' | 'always' | 'never'
  onSaveSettings?: ReturnType<typeof vi.fn>
} = {}) {
  render(
    <TooltipProvider>
      <SettingsModal
        open={open}
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            configuredVersion: '2.5.0',
            latestVersion: '2.5.0',
            isLatest: true,
            lookupStatus: 'ok',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
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
      reducedMotionPreference: 'always',
    })

    expect(screen.getByText('Dashboard-Einstellungen')).toBeInTheDocument()
    expect(screen.getByText(/Browsereinstellung/)).toBeInTheDocument()
    expect(screen.getByText(/Toast-Benachrichtigungen/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Immer' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('loads and displays the pinned toktrack version state when the dialog opens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          configuredVersion: '2.5.0',
          latestVersion: '2.4.1',
          isLatest: false,
          lookupStatus: 'ok',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderSettingsModal()

    expect(screen.getByTestId('settings-toktrack-version')).toHaveTextContent('2.5.0')

    await vi.waitFor(() => {
      expect(screen.getByTestId('settings-toktrack-status')).toHaveTextContent(
        'Update available: 2.4.1',
      )
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/toktrack/version-status')
  })

  it('only checks the latest toktrack version after the dialog becomes visible', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          configuredVersion: '2.5.0',
          latestVersion: '2.5.0',
          isLatest: true,
          lookupStatus: 'ok',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(
      <TooltipProvider>
        <SettingsModal
          open={false}
          onOpenChange={vi.fn()}
          language="de"
          reducedMotionPreference="system"
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
          onSaveSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportSettings={vi.fn()}
          onExportData={vi.fn()}
          onImportData={vi.fn()}
        />
      </TooltipProvider>,
    )

    expect(fetchMock).not.toHaveBeenCalled()

    rerender(
      <TooltipProvider>
        <SettingsModal
          open={true}
          onOpenChange={vi.fn()}
          language="de"
          reducedMotionPreference="system"
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
          onSaveSettings={vi.fn()}
          onExportSettings={vi.fn()}
          onImportSettings={vi.fn()}
          onExportData={vi.fn()}
          onImportData={vi.fn()}
        />
      </TooltipProvider>,
    )

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a warning when the latest toktrack version check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    renderSettingsModal()

    await vi.waitFor(
      () => {
        expect(screen.getByTestId('settings-toktrack-status')).toHaveTextContent(
          'Latest version could not be checked',
        )
      },
      { timeout: 10_000 },
    )
  }, 10_000)
})
