import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import type { DashboardCommandPaletteViewModel } from '@/types/dashboard-view-model'
import {
  buildCommandPaletteCommands,
  filterCommandItems,
  getVisibleCommandItems,
  type CommandItem,
} from './CommandPalette.commands'

type CommandPaletteProps = DashboardCommandPaletteViewModel

/** Renders the keyboard-first command palette for dashboard actions. */
export function CommandPalette({
  isDark,
  availableProviders,
  selectedProviders,
  availableModels,
  selectedModels,
  hasTodaySection,
  hasMonthSection,
  hasRequestSection,
  sectionVisibility,
  sectionOrder,
  reportGenerating,
  onToggleTheme,
  onExportCSV,
  onGenerateReport,
  onDelete,
  onUpload,
  onAutoImport,
  onOpenSettings,
  onScrollTo,
  onViewModeChange,
  onApplyPreset,
  onToggleProvider,
  onToggleModel,
  onClearProviders,
  onClearModels,
  onClearDateRange,
  onResetAll,
  onHelp,
  onLanguageChange,
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const commands = useMemo(
    () =>
      buildCommandPaletteCommands({
        isDark,
        availableProviders,
        selectedProviders,
        availableModels,
        selectedModels,
        hasTodaySection,
        hasMonthSection,
        hasRequestSection,
        sectionVisibility,
        sectionOrder,
        reportGenerating,
        onToggleTheme,
        onExportCSV,
        onGenerateReport,
        onDelete,
        onUpload,
        onAutoImport,
        onOpenSettings,
        onScrollTo,
        onScrollTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        onScrollBottom: () =>
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
        onViewModeChange,
        onApplyPreset,
        onToggleProvider,
        onToggleModel,
        onClearProviders,
        onClearModels,
        onClearDateRange,
        onResetAll,
        onHelp,
        onLanguageChange,
        t: (key, options) => (options === undefined ? t(key) : t(key, options)),
      }),
    [
      isDark,
      availableProviders,
      selectedProviders,
      availableModels,
      selectedModels,
      hasTodaySection,
      hasMonthSection,
      hasRequestSection,
      sectionVisibility,
      sectionOrder,
      reportGenerating,
      onToggleTheme,
      onAutoImport,
      onOpenSettings,
      onExportCSV,
      onGenerateReport,
      onUpload,
      onDelete,
      onViewModeChange,
      onApplyPreset,
      onClearProviders,
      onClearModels,
      onClearDateRange,
      onResetAll,
      onScrollTo,
      onToggleProvider,
      onToggleModel,
      onLanguageChange,
      onHelp,
      t,
    ],
  )

  const filteredCommands = useMemo(() => filterCommandItems(commands, search), [commands, search])

  const visibleCommands = useMemo(
    () => getVisibleCommandItems(filteredCommands),
    [filteredCommands],
  )
  const groups = useMemo(
    () => Array.from(new Set(filteredCommands.map((c) => c.group))),
    [filteredCommands],
  )

  const runCommand = (cmd: CommandItem) => {
    setOpen(false)
    setSearch('')
    cmd.action()
  }

  useEffect(() => {
    if (!open) return

    const handleQuickSelect = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (!/^[1-9]$/.test(e.key)) return

      const index = Number(e.key) - 1
      const command = visibleCommands[index]
      if (!command) return

      e.preventDefault()
      runCommand(command)
    }

    document.addEventListener('keydown', handleQuickSelect)
    return () => document.removeEventListener('keydown', handleQuickSelect)
  }, [open, visibleCommands])

  useEffect(() => {
    if (!open && search) {
      setSearch('')
    }
  }, [open, search])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('commandPalette.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('commandPalette.description')}</DialogDescription>
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder={t('commandPalette.placeholder')}
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {t('commandPalette.empty')}
            </Command.Empty>
            {groups.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {filteredCommands
                  .filter((c) => c.group === group)
                  .map((cmd) => {
                    const quickIndex = visibleCommands.findIndex((visible) => visible.id === cmd.id)

                    return (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.id}
                        data-testid={cmd.testId ?? `command-${cmd.id}`}
                        onSelect={() => runCommand(cmd)}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                      >
                        {cmd.icon}
                        <div className="min-w-0 flex-1">
                          <div>{cmd.label}</div>
                          {cmd.description && (
                            <div className="truncate text-xs text-muted-foreground">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {quickIndex >= 0 && (
                          <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {quickIndex + 1}
                          </kbd>
                        )}
                      </Command.Item>
                    )
                  })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
