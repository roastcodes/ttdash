// @vitest-environment jsdom

import { fireEvent, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderCommandPalette(overrides: Partial<CommandPaletteProps> = {}) {
  return renderWithAppProviders(<CommandPalette {...buildCommandPaletteProps(overrides)} />)
}

function openCommandPalette() {
  fireEvent.keyDown(document, { key: 'k', metaKey: true })
}

function getCommandGroup(name: string) {
  const group = screen.getByText(name).closest('[cmdk-group]')
  expect(group).not.toBeNull()
  return group as HTMLElement
}

describe('CommandPalette action groups', () => {
  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn()
    await initI18n('en')
  })

  it('keeps action command ids stable while separating daily, export, and maintenance groups', async () => {
    renderCommandPalette()

    openCommandPalette()
    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()

    const loadDataGroup = getCommandGroup('Load data')
    expect(within(loadDataGroup).getByTestId('command-auto-import')).toBeInTheDocument()
    expect(within(loadDataGroup).getByTestId('command-upload')).toBeInTheDocument()

    const exportsGroup = getCommandGroup('Exports')
    expect(within(exportsGroup).getByTestId('command-csv')).toBeInTheDocument()
    expect(within(exportsGroup).getByTestId('command-report')).toBeInTheDocument()

    const maintenanceGroup = getCommandGroup('Maintenance')
    expect(within(maintenanceGroup).getByTestId('command-settings-open')).toBeInTheDocument()
    expect(within(maintenanceGroup).getByTestId('command-delete')).toBeInTheDocument()

    for (const commandId of [
      'command-auto-import',
      'command-upload',
      'command-csv',
      'command-report',
      'command-settings-open',
      'command-delete',
    ]) {
      expect(screen.getByTestId(commandId)).toBeInTheDocument()
    }
  })

  it('localizes the command group labels', async () => {
    const currentLanguage = document.documentElement.lang

    try {
      await initI18n('de')
      renderCommandPalette()

      openCommandPalette()

      expect(await screen.findByText('Daten laden')).toBeInTheDocument()
      expect(screen.getByText('Exporte')).toBeInTheDocument()
      expect(screen.getByText('Wartung')).toBeInTheDocument()
    } finally {
      await initI18n(currentLanguage || 'en')
    }
  })
})
