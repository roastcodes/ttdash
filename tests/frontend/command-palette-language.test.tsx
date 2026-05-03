// @vitest-environment jsdom

import { fireEvent, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from '@/components/features/command-palette/CommandPalette'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { initI18n } from '@/lib/i18n'
import { renderWithAppProviders } from '../test-utils'

type CommandPaletteProps = ComponentProps<typeof CommandPalette>

function buildCommandPaletteProps(
  overrides: Partial<CommandPaletteProps> = {},
): CommandPaletteProps {
  const noop = () => {}

  return {
    isDark: true,
    availableProviders: [],
    selectedProviders: [],
    availableModels: [],
    selectedModels: [],
    hasTodaySection: false,
    hasMonthSection: false,
    hasRequestSection: false,
    sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
    sectionOrder: [...DEFAULT_APP_SETTINGS.sectionOrder],
    reportGenerating: false,
    onToggleTheme: noop,
    onExportCSV: noop,
    onGenerateReport: noop,
    onDelete: noop,
    onUpload: noop,
    onAutoImport: noop,
    onOpenSettings: noop,
    onScrollTo: noop,
    onViewModeChange: noop,
    onApplyPreset: noop,
    onToggleProvider: noop,
    onToggleModel: noop,
    onClearProviders: noop,
    onClearModels: noop,
    onClearDateRange: noop,
    onResetAll: noop,
    onHelp: noop,
    onLanguageChange: noop,
    ...overrides,
  }
}

describe('Command palette language', () => {
  let originalScrollIntoView: Element['scrollIntoView'] | undefined

  beforeAll(async () => {
    originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    await initI18n('de')
  })

  afterAll(async () => {
    if (originalScrollIntoView) {
      Element.prototype.scrollIntoView = originalScrollIntoView
    } else {
      delete (Element.prototype as { scrollIntoView?: Element['scrollIntoView'] }).scrollIntoView
    }

    await initI18n('en')
  })

  it('localizes action groups while keeping representative command ids renderable', async () => {
    renderWithAppProviders(<CommandPalette {...buildCommandPaletteProps()} />)

    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    expect(await screen.findByRole('dialog', { name: 'Befehlspalette' })).toBeInTheDocument()
    expect(screen.getByText('Daten laden')).toBeInTheDocument()
    expect(screen.getByText('Exporte')).toBeInTheDocument()
    expect(screen.getByText('Wartung')).toBeInTheDocument()
    expect(screen.getByTestId('command-auto-import')).toBeInTheDocument()
    expect(screen.getByTestId('command-csv')).toBeInTheDocument()
    expect(screen.getByTestId('command-settings-open')).toBeInTheDocument()
  })
})
