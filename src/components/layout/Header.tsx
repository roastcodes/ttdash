import { useEffect, useRef } from 'react'
import {
  ChevronDown,
  Upload,
  Trash2,
  Download,
  Moon,
  Sun,
  CircleHelp,
  Zap,
  Flame,
  FileUp,
  HardDrive,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { NPM_PACKAGE_URL, VERSION } from '@/lib/constants'
import type {
  DashboardDataSource,
  DashboardHeaderViewModel,
  DashboardStartupAutoLoadBadge,
} from '@/types/dashboard-view-model'

interface HeaderProps extends DashboardHeaderViewModel {
  settingsButton?: React.ReactNode
  pdfButton?: React.ReactNode
}

const headerActionButtonClass = 'h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm'

function DataSourceBadge({ source }: { source: DashboardDataSource }) {
  const { t } = useTranslation()

  if (source.type === 'auto-import') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400"
        title={source.title ?? t('emptyState.autoImport')}
      >
        <Zap className="h-2.5 w-2.5" />
        {t('emptyState.autoImport')}
        {source.time && <span className="text-green-700 dark:text-green-400">· {source.time}</span>}
      </span>
    )
  }
  if (source.type === 'file') {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400"
        title={source.title ?? source.label ?? t('emptyState.uploadFile')}
      >
        <FileUp className="h-2.5 w-2.5 shrink-0" />
        <span className="max-w-28 truncate sm:max-w-40">
          {source.label ?? t('emptyState.uploadFile')}
        </span>
        {source.time && (
          <span className="shrink-0 text-blue-700 dark:text-blue-400">· {source.time}</span>
        )}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
      title={source.title ?? t('header.loaded')}
    >
      <HardDrive className="h-2.5 w-2.5" />
      {t('header.loaded')}
      {source.time && <span className="text-muted-foreground">· {source.time}</span>}
    </span>
  )
}

function StartupAutoLoadBadge({ badge }: { badge: DashboardStartupAutoLoadBadge }) {
  const { t } = useTranslation()

  if (!badge.active) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-400"
      title={badge.title ?? t('header.autoLoadActive')}
    >
      <Zap className="h-2.5 w-2.5" />
      {t('header.autoLoadActive')}
      {badge.time && <span className="text-amber-800 dark:text-amber-400">· {badge.time}</span>}
    </span>
  )
}

function HeaderActionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement | null>(null)
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      const menu = ref.current
      if (!menu?.open) return
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        menu.open = false
        menu.querySelector('summary')?.focus()
      } else if (!menu.contains(event.target as Node)) menu.open = false
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', close)
    }
  }, [])
  return (
    <details
      ref={ref}
      className="relative"
      data-action-menu
      onClickCapture={(event) => {
        if (!(event.target as Element).closest('button')) return
        const menu = event.currentTarget
        menu.open = false
        menu.querySelector('summary')?.focus()
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-9 sm:text-sm">
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </summary>
      <div
        role="group"
        aria-label={label}
        className="absolute top-full right-0 z-40 mt-2 flex min-w-48 flex-col gap-1 rounded-xl border border-border bg-popover p-2 shadow-xl"
      >
        {children}
      </div>
    </details>
  )
}

function HeaderActions({
  onAutoImport,
  onUpload,
  onExportCSV,
  onDelete,
  settingsButton,
  pdfButton,
}: Pick<DashboardHeaderViewModel, 'onAutoImport' | 'onUpload' | 'onExportCSV' | 'onDelete'> &
  Pick<HeaderProps, 'settingsButton' | 'pdfButton'>) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAutoImport}
        title={t('emptyState.autoImport')}
        className={headerActionButtonClass}
      >
        <Zap className="h-4 w-4" />
        <span>{t('header.import')}</span>
      </Button>
      <HeaderActionGroup label={t('header.dataMenu')}>
        <Button
          variant="outline"
          size="sm"
          onClick={onUpload}
          title={t('emptyState.uploadFile')}
          className={headerActionButtonClass}
        >
          <Upload className="h-4 w-4" />
          <span>{t('header.upload')}</span>
        </Button>
      </HeaderActionGroup>

      <HeaderActionGroup label={t('header.exportMenu')}>
        {pdfButton}
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          title={t('commandPalette.commands.exportCsv.label')}
          className={headerActionButtonClass}
        >
          <Download className="h-4 w-4" />
          <span>{t('header.csv')}</span>
        </Button>
      </HeaderActionGroup>

      {settingsButton}
      <HeaderActionGroup label={t('header.moreMenu')}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title={t('commandPalette.commands.delete.label')}
          className={`${headerActionButtonClass} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
        >
          <Trash2 className="h-4 w-4" />
          <span>{t('header.delete')}</span>
        </Button>
      </HeaderActionGroup>
    </div>
  )
}

/** Renders the global dashboard header and primary actions. */
export function Header({
  dateRange,
  isDark,
  currentLanguage,
  streak,
  dataSource,
  startupAutoLoad,
  onHelpOpenChange,
  onLanguageChange,
  onToggleTheme,
  onExportCSV,
  onDelete,
  onUpload,
  onAutoImport,
  settingsButton,
  pdfButton,
}: HeaderProps) {
  const { t } = useTranslation()
  const themeToggleLabel = isDark
    ? t('commandPalette.commands.themeLight.label')
    : t('commandPalette.commands.themeDark.label')

  return (
    <header className="space-y-3 px-1 py-4 sm:py-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="shrink-0 text-2xl font-bold tracking-tight">
                <span className="text-primary">TT</span>Dash
              </h1>
              <a
                href={NPM_PACKAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-sm font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                title={t('header.versionLinkTitle', { version: VERSION })}
                aria-label={t('header.versionLinkTitle', { version: VERSION })}
              >
                v{VERSION}
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dateRange && (
              <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {dateRange.start} — {dateRange.end}
              </span>
            )}
            {dataSource && <DataSourceBadge source={dataSource} />}
            {startupAutoLoad && <StartupAutoLoadBadge badge={startupAutoLoad} />}
            {streak != null && streak > 1 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-800 dark:text-orange-400">
                <Flame className="h-3 w-3" />
                {t('header.streak', { count: streak })}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="inline-flex items-center rounded-md border border-border/50 bg-muted/20 p-0.5">
            {(['de', 'en'] as const).map((language) => (
              <button
                key={language}
                type="button"
                data-testid={`language-switcher-${language}`}
                onClick={() => onLanguageChange(language)}
                aria-pressed={currentLanguage === language}
                className={`min-h-11 min-w-11 rounded px-2 py-1 text-xs font-medium transition-colors sm:min-h-9 sm:min-w-9 ${currentLanguage === language ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title={t(`app.languages.${language}`)}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={() => onHelpOpenChange(true)}
            aria-label={t('header.help')}
            title={t('header.help')}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <kbd className="hidden items-center gap-0.5 rounded border border-border/30 bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
            ⌘K
          </kbd>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 sm:h-9 sm:w-9"
            onClick={onToggleTheme}
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <HeaderActions
        onAutoImport={onAutoImport}
        onUpload={onUpload}
        onExportCSV={onExportCSV}
        onDelete={onDelete}
        settingsButton={settingsButton}
        pdfButton={pdfButton}
      />
    </header>
  )
}
