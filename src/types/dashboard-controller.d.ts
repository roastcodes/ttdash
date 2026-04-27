import type {
  AggregateMetrics,
  ChartDataPoint,
  DailyUsage,
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardForecastState,
  DashboardMetrics,
  DateRange,
  ModelCostChartPoint,
  RequestChartDataPoint,
  TokenChartDataPoint,
  ViewMode,
  WeekdayData,
} from '@/types'
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
} from '@/types/dashboard-view-model'

/** Describes the file input ref shape exposed by the dashboard controller. */
export interface DashboardFileInputRef {
  current: HTMLInputElement | null
}

/** Describes the minimal file input change event shape consumed by upload actions. */
export interface DashboardFileInputChangeEvent {
  target: HTMLInputElement
}

/** Describes one JSON download emitted by the dashboard controller. */
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
  usageUploadRef: DashboardFileInputRef
  settingsImportRef: DashboardFileInputRef
  dataImportRef: DashboardFileInputRef
  onUsageUploadChange: (event: DashboardFileInputChangeEvent) => Promise<void> | void
  onSettingsImportChange: (event: DashboardFileInputChangeEvent) => Promise<void> | void
  onDataImportChange: (event: DashboardFileInputChangeEvent) => Promise<void> | void
}

/** Captures the filter hook surface consumed by the dashboard controller. */
export interface DashboardControllerFiltersState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedMonth: string | null
  setSelectedMonth: (month: string | null) => void
  selectedProviders: string[]
  toggleProvider: (provider: string) => void
  clearProviders: () => void
  selectedModels: string[]
  toggleModel: (model: string) => void
  clearModels: () => void
  startDate: string | undefined
  setStartDate: (date: string | undefined) => void
  endDate: string | undefined
  setEndDate: (date: string | undefined) => void
  resetAll: () => void
  applyDefaultFilters: (nextDefaultFilters?: DashboardDefaultFilters) => void
  applyPreset: (preset: DashboardDatePreset) => void
  filteredDailyData: DailyUsage[]
  filteredData: DailyUsage[]
  availableMonths: string[]
  availableProviders: string[]
  availableModels: string[]
  dateRange: DateRange | null
}

/** Captures the computed dashboard metrics surface consumed by the controller. */
export interface DashboardControllerComputedState {
  metrics: DashboardMetrics
  modelCosts: Map<string, AggregateMetrics>
  providerMetrics: Map<string, AggregateMetrics>
  costChartData: ChartDataPoint[]
  modelCostChartData: ModelCostChartPoint[]
  tokenChartData: TokenChartDataPoint[]
  requestChartData: RequestChartDataPoint[]
  weekdayData: WeekdayData[]
  allModels: string[]
  modelPieData: Array<{ name: string; value: number }>
  tokenPieData: Array<{ name: string; value: number }>
}

/** Collects the heavy derived data assembled for the dashboard controller. */
export interface DashboardControllerDerivedState {
  hasData: boolean
  filters: DashboardControllerFiltersState
  computed: DashboardControllerComputedState
  totalCalendarDays: number
  todayData: DailyUsage | null
  hasCurrentMonthData: boolean
  visibleLimitProviders: string[]
  forecastState: DashboardForecastState
  settingsProviderOptions: string[]
  settingsModelOptions: string[]
  streak: number
  filterBarModels: string[]
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
