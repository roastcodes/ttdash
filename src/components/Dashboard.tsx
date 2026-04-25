import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { Header } from './layout/Header'
import { FilterBar } from './layout/FilterBar'
import { EmptyState } from './EmptyState'
import { LoadErrorState } from './LoadErrorState'
import { CommandPalette } from './features/command-palette/CommandPalette'
import { PDFReportButton } from './features/pdf-report/PDFReport'
import { DashboardSections } from './dashboard/DashboardSections'
import { DashboardSkeleton } from './ui/skeleton'
import { Button } from './ui/button'
import { useDashboardControllerWithBootstrap } from '@/hooks/use-dashboard-controller'
import { ModelColorPaletteProvider } from '@/lib/model-color-context'
import { scheduleToktrackVersionStatusWarmup } from '@/lib/toktrack-version-status'
import type { AppSettings } from '@/types'

const DrillDownModal = lazy(() =>
  import('./features/drill-down/DrillDownModal').then((module) => ({
    default: module.DrillDownModal,
  })),
)
const AutoImportModal = lazy(() =>
  import('./features/auto-import/AutoImportModal').then((module) => ({
    default: module.AutoImportModal,
  })),
)
const SettingsModal = lazy(() =>
  import('./features/settings/SettingsModal').then((module) => ({
    default: module.SettingsModal,
  })),
)
const HelpPanel = lazy(() =>
  import('./features/help/HelpPanel').then((module) => ({
    default: module.HelpPanel,
  })),
)

interface DashboardProps {
  initialSettings: AppSettings
  initialSettingsError?: string | null
  initialSettingsLoadedFromServer?: boolean
  initialSettingsFetchedAt?: number | null
}

/** Renders the full dashboard experience around the shared controller state. */
export function Dashboard({
  initialSettings,
  initialSettingsError = null,
  initialSettingsLoadedFromServer = false,
  initialSettingsFetchedAt = null,
}: DashboardProps) {
  const { t } = useTranslation()
  const controller = useDashboardControllerWithBootstrap(
    initialSettings,
    initialSettingsLoadedFromServer,
    initialSettingsFetchedAt,
    initialSettingsError,
  )

  useEffect(() => {
    const warmupHandle = scheduleToktrackVersionStatusWarmup()
    return () => {
      warmupHandle.cancel()
    }
  }, [])

  const fileInputs = (
    <>
      <input
        ref={controller.fileInputs.usageUploadRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={controller.fileInputs.onUsageUploadChange}
        data-testid="usage-upload-input"
      />
      <input
        ref={controller.fileInputs.settingsImportRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={controller.fileInputs.onSettingsImportChange}
        data-testid="settings-import-input"
      />
      <input
        ref={controller.fileInputs.dataImportRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={controller.fileInputs.onDataImportChange}
        data-testid="data-import-input"
      />
    </>
  )

  const autoImportDialog = (
    <Suspense fallback={null}>
      {controller.dialogs.autoImport.open && <AutoImportModal {...controller.dialogs.autoImport} />}
    </Suspense>
  )

  const settingsDialog = (
    <Suspense fallback={null}>
      {controller.settingsModal.open && <SettingsModal {...controller.settingsModal} />}
    </Suspense>
  )

  const helpDialog = (
    <Suspense fallback={null}>
      {controller.dialogs.helpPanel.open && <HelpPanel {...controller.dialogs.helpPanel} />}
    </Suspense>
  )

  if (!controller.loadError && (controller.shell.isLoading || controller.shell.settingsLoading)) {
    return <DashboardSkeleton />
  }

  if (controller.loadError) {
    return (
      <>
        <LoadErrorState {...controller.loadError} />
        {fileInputs}
        {helpDialog}
      </>
    )
  }

  if (!controller.shell.hasData) {
    return (
      <>
        <EmptyState {...controller.emptyState} />
        {fileInputs}
        {autoImportDialog}
        {settingsDialog}
        {helpDialog}
      </>
    )
  }

  return (
    <ModelColorPaletteProvider modelNames={controller.shell.modelPaletteModelNames}>
      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-8">
        {fileInputs}
        {autoImportDialog}
        {settingsDialog}
        {helpDialog}

        <Header
          {...controller.header}
          settingsButton={
            <Button
              variant="outline"
              size="sm"
              onClick={controller.emptyState.onOpenSettings}
              title={t('header.settings')}
              className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t('header.settings')}</span>
            </Button>
          }
          pdfButton={
            <PDFReportButton
              generating={controller.report.generating}
              onGenerate={controller.report.onGenerate}
            />
          }
        />

        <div id="filters">
          <FilterBar {...controller.filterBar} />
        </div>

        <div key={controller.shell.animationKey} className="mt-4 space-y-4">
          <DashboardSections viewModel={controller.sections} />
        </div>

        <Suspense fallback={null}>
          {controller.dialogs.drillDown.open && (
            <DrillDownModal {...controller.dialogs.drillDown} />
          )}
        </Suspense>
        <CommandPalette {...controller.commandPalette} />
      </div>
    </ModelColorPaletteProvider>
  )
}
