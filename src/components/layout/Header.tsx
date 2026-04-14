import {
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
import type { AppLanguage } from '@/types'

interface DataSource {
  type: 'stored' | 'auto-import' | 'file'
  label?: string
  time?: string
  title?: string
}

interface StartupAutoLoad {
  active: boolean
  time?: string
  title?: string
}

interface HeaderProps {
  dateRange: { start: string; end: string } | null
  isDark: boolean
  currentLanguage: AppLanguage
  streak?: number
  dataSource?: DataSource | null
  startupAutoLoad?: StartupAutoLoad | null
  onHelpOpenChange: (open: boolean) => void
  onLanguageChange: (language: AppLanguage) => void
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  settingsButton?: React.ReactNode
  pdfButton?: React.ReactNode
}

function DataSourceBadge({ source }: { source: DataSource }) {
  const { t } = useTranslation()

  if (source.type === 'auto-import') {
    return (
      <span
        className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20"
        title={source.title ?? t('emptyState.autoImport')}
      >
        <Zap className="h-2.5 w-2.5" />
        {t('emptyState.autoImport')}
        {source.time && <span className="text-green-400/60">· {source.time}</span>}
      </span>
    )
  }
  if (source.type === 'file') {
    return (
      <span
        className="text-[10px] font-medium inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20"
        title={source.title ?? source.label ?? t('emptyState.uploadFile')}
      >
        <FileUp className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate max-w-28 sm:max-w-40">
          {source.label ?? t('emptyState.uploadFile')}
        </span>
        {source.time && <span className="text-blue-400/60 shrink-0">· {source.time}</span>}
      </span>
    )
  }
  return (
    <span
      className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border/50"
      title={source.title ?? t('header.loaded')}
    >
      <HardDrive className="h-2.5 w-2.5" />
      {t('header.loaded')}
      {source.time && <span className="text-muted-foreground/70">· {source.time}</span>}
    </span>
  )
}

function StartupAutoLoadBadge({ badge }: { badge: StartupAutoLoad }) {
  const { t } = useTranslation()

  if (!badge.active) return null

  return (
    <span
      className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
      title={badge.title ?? t('header.autoLoadActive')}
    >
      <Zap className="h-2.5 w-2.5" />
      {t('header.autoLoadActive')}
      {badge.time && <span className="text-amber-400/70">· {badge.time}</span>}
    </span>
  )
}

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

  return (
    <header className="py-4 px-1 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight shrink-0">
                <span className="text-primary">TT</span>Dash
              </h1>
              <a
                href={NPM_PACKAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground font-mono shrink-0 rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title={t('header.versionLinkTitle', { version: VERSION })}
                aria-label={t('header.versionLinkTitle', { version: VERSION })}
              >
                v{VERSION}
              </a>
            </div>
            <div className="flex items-center gap-1 shrink-0 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onHelpOpenChange(true)}
                title={t('header.help')}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleTheme}
                title={t('commandPalette.commands.themeDark.description')}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dateRange && (
              <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
                {dateRange.start} — {dateRange.end}
              </span>
            )}
            {dataSource && <DataSourceBadge source={dataSource} />}
            {startupAutoLoad && <StartupAutoLoadBadge badge={startupAutoLoad} />}
            {streak != null && streak > 1 && (
              <span className="text-xs font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                <Flame className="h-3 w-3" />
                {t('header.streak', { count: streak })}
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <div className="inline-flex items-center rounded-md border border-border/50 bg-muted/20 p-0.5">
            {(['de', 'en'] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => onLanguageChange(language)}
                className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${currentLanguage === language ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title={t(`app.languages.${language}`)}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onHelpOpenChange(true)}
            title={t('header.help')}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-muted/20">
            ⌘K
          </kbd>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            title={t('commandPalette.commands.themeDark.description')}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAutoImport}
          title={t('emptyState.autoImport')}
          className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
        >
          <Zap className="h-4 w-4" />
          <span>{t('header.import')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onUpload}
          title={t('emptyState.uploadFile')}
          className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
        >
          <Upload className="h-4 w-4" />
          <span>{t('header.upload')}</span>
        </Button>
        <div className="contents sm:block sm:w-px sm:h-5 sm:bg-border/50" />
        <div className="contents sm:block">{settingsButton}</div>
        <div className="contents sm:block">{pdfButton}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          title={t('commandPalette.commands.exportCsv.label')}
          className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
        >
          <Download className="h-4 w-4" />
          <span>{t('header.csv')}</span>
        </Button>
        <div className="contents sm:block sm:w-px sm:h-5 sm:bg-border/50" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title={t('commandPalette.commands.delete.label')}
          className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span>{t('header.delete')}</span>
        </Button>
      </div>
    </header>
  )
}
