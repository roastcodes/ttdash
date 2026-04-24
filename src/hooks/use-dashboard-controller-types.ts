import type { ChangeEvent, RefObject } from 'react'
import type {
  DashboardAutoImportDialogViewModel,
  DashboardCommandPaletteViewModel,
  DashboardDialogViewModel,
  DashboardDrillDownViewModel,
  DashboardEmptyStateViewModel,
  DashboardFilterBarViewModel,
  DashboardHeaderViewModel,
  DashboardLoadErrorViewModel,
  DashboardReportViewModel,
  DashboardSectionsViewModel,
  DashboardSettingsModalViewModel,
} from '@/lib/dashboard-view-model'

/** Captures one JSON download emitted by the dashboard controller. */
export interface JsonDownloadRecord {
  filename: string
  mimeType: string
  size: number
  text: string
}

/** Exposes optional browser hooks used by frontend tests. */
export interface DashboardTestHooks {
  onJsonDownload?: (record: JsonDownloadRecord) => void
  openSettings?: () => void
}

/** Describes the hidden file inputs that back upload and import actions. */
export interface DashboardFileInputsViewModel {
  usageUploadRef: RefObject<HTMLInputElement | null>
  settingsImportRef: RefObject<HTMLInputElement | null>
  dataImportRef: RefObject<HTMLInputElement | null>
  onUsageUploadChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
  onSettingsImportChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
  onDataImportChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
}

/** Describes the shell state that wraps the dashboard composition. */
export interface DashboardShellViewModel {
  isLoading: boolean
  settingsLoading: boolean
  hasData: boolean
  isDark: boolean
  animationKey: number
  modelPaletteModelNames: string[]
}

/** Groups the dashboard-owned modal and panel states. */
export interface DashboardDialogsViewModel {
  helpPanel: DashboardDialogViewModel
  autoImport: DashboardAutoImportDialogViewModel
  drillDown: DashboardDrillDownViewModel
}

/** Describes the full dashboard composition contract returned by the controller. */
export interface DashboardControllerViewModel {
  fileInputs: DashboardFileInputsViewModel
  shell: DashboardShellViewModel
  loadError: DashboardLoadErrorViewModel | null
  emptyState: DashboardEmptyStateViewModel
  header: DashboardHeaderViewModel
  report: DashboardReportViewModel
  filterBar: DashboardFilterBarViewModel
  sections: DashboardSectionsViewModel
  settingsModal: DashboardSettingsModalViewModel
  dialogs: DashboardDialogsViewModel
  commandPalette: DashboardCommandPaletteViewModel
}
