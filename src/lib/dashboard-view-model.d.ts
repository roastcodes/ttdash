import type { DashboardForecastState } from './calculations'
import type { ModelCostChartPoint } from './data-transforms'
import type {
  AggregateMetrics,
  AppLanguage,
  ChartDataPoint,
  DailyUsage,
  DashboardDefaultFilters,
  DashboardMetrics,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  DataLoadSource,
  ProviderLimits,
  ReducedMotionPreference,
  RequestChartDataPoint,
  TokenChartDataPoint,
  ViewMode,
  WeekdayData,
} from '@/types'

/** Describes the current dashboard data source badge shown in the header. */
export interface DashboardDataSource {
  type: 'stored' | 'auto-import' | 'file'
  label?: string
  time?: string
  title?: string
}

/** Describes the startup auto-load badge shown in the header. */
export interface DashboardStartupAutoLoadBadge {
  active: boolean
  time?: string
  title?: string
}

/** Describes the actions rendered in the fatal load-error state. */
export interface DashboardLoadErrorAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

/** Describes the full fatal load-error state rendered by the dashboard shell. */
export interface DashboardLoadErrorViewModel {
  title: string
  description: string
  details: string[]
  detailLabel: string
  actions: DashboardLoadErrorAction[]
}

/** Describes the primary dashboard header data and actions. */
export interface DashboardHeaderViewModel {
  dateRange: { start: string; end: string } | null
  isDark: boolean
  currentLanguage: AppLanguage
  streak?: number
  dataSource?: DashboardDataSource | null
  startupAutoLoad?: DashboardStartupAutoLoadBadge | null
  onHelpOpenChange: (open: boolean) => void
  onLanguageChange: (language: AppLanguage) => void
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
}

/** Describes the report generation state exposed to the dashboard shell. */
export interface DashboardReportViewModel {
  generating: boolean
  onGenerate: () => Promise<void> | void
}

/** Describes the dashboard filter bar state and actions. */
export interface DashboardFilterBarViewModel {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  availableMonths: string[]
  availableProviders: string[]
  selectedProviders: string[]
  onToggleProvider: (provider: string) => void
  onClearProviders: () => void
  allModels: string[]
  selectedModels: string[]
  onToggleModel: (model: string) => void
  onClearModels: () => void
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string | undefined) => void
  onEndDateChange: (date: string | undefined) => void
  onApplyPreset: (preset: string) => void
  onResetAll: () => void
}

/** Describes the empty-state actions for the dashboard shell. */
export interface DashboardEmptyStateViewModel {
  onUpload: () => void
  onAutoImport: () => void
  onOpenSettings: () => void
}

/** Describes one generic open/change dialog state. */
export interface DashboardDialogViewModel {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Describes the auto-import modal state and success handler. */
export interface DashboardAutoImportDialogViewModel extends DashboardDialogViewModel {
  onSuccess: () => void
}

/** Describes the settings modal state, data, and actions. */
export interface DashboardSettingsModalViewModel extends DashboardDialogViewModel {
  language: AppLanguage
  reducedMotionPreference: ReducedMotionPreference
  limitProviders: string[]
  filterProviders: string[]
  models: string[]
  limits: ProviderLimits
  defaultFilters: DashboardDefaultFilters
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  lastLoadedAt?: string | null
  lastLoadSource?: DataLoadSource | null
  cliAutoLoadActive?: boolean
  hasData: boolean
  onSaveSettings: (settings: {
    language: AppLanguage
    reducedMotionPreference: ReducedMotionPreference
    providerLimits: ProviderLimits
    defaultFilters: DashboardDefaultFilters
    sectionVisibility: DashboardSectionVisibility
    sectionOrder: DashboardSectionOrder
  }) => Promise<void> | void
  onExportSettings: () => void
  onImportSettings: () => void
  onExportData: () => void
  onImportData: () => void
  settingsBusy?: boolean
  dataBusy?: boolean
}

/** Describes the drill-down modal state and navigation. */
export interface DashboardDrillDownViewModel {
  day: DailyUsage | null
  contextData?: DailyUsage[]
  open: boolean
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalCount?: number
  onPrevious?: () => void
  onNext?: () => void
  onClose: () => void
}

/** Describes the dashboard command palette data and actions. */
export interface DashboardCommandPaletteViewModel {
  isDark: boolean
  availableProviders: string[]
  selectedProviders: string[]
  availableModels: string[]
  selectedModels: string[]
  hasTodaySection: boolean
  hasMonthSection: boolean
  hasRequestSection: boolean
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  reportGenerating: boolean
  onToggleTheme: () => void
  onExportCSV: () => void
  onGenerateReport: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  onOpenSettings: () => void
  onScrollTo: (section: string) => void
  onViewModeChange: (mode: ViewMode) => void
  onApplyPreset: (preset: string) => void
  onToggleProvider: (provider: string) => void
  onToggleModel: (model: string) => void
  onClearProviders: () => void
  onClearModels: () => void
  onClearDateRange: () => void
  onResetAll: () => void
  onHelp: () => void
  onLanguageChange: (language: AppLanguage) => void
}

/** Groups the section-order and section-visibility controls. */
export interface DashboardSectionsLayoutViewModel {
  sectionOrder: DashboardSectionOrder
  sectionVisibility: DashboardSectionVisibility
}

/** Groups the overview and activity section inputs. */
export interface DashboardOverviewSectionsViewModel {
  metrics: DashboardMetrics
  viewMode: ViewMode
  totalCalendarDays: number
  filteredData: DailyUsage[]
  filteredDailyData: DailyUsage[]
  todayData: DailyUsage | null
  hasCurrentMonthData: boolean
  isDark: boolean
}

/** Groups the forecast/cache section inputs. */
export interface DashboardForecastSectionsViewModel {
  filteredData: DailyUsage[]
  forecastState: DashboardForecastState
  metrics: DashboardMetrics
  viewMode: ViewMode
}

/** Groups the provider limits section inputs. */
export interface DashboardLimitsSectionsViewModel {
  filteredDailyData: DailyUsage[]
  visibleLimitProviders: string[]
  providerLimits: ProviderLimits
  selectedMonth: string | null
}

/** Groups the cost analysis section inputs. */
export interface DashboardCostAnalysisSectionsViewModel {
  filteredData: DailyUsage[]
  forecastState: DashboardForecastState
  allModels: string[]
  costChartData: ChartDataPoint[]
  modelPieData: Array<{ name: string; value: number }>
  modelCostChartData: ModelCostChartPoint[]
  weekdayData: WeekdayData[]
}

/** Groups the token analysis section inputs. */
export interface DashboardTokenAnalysisSectionsViewModel {
  tokenChartData: TokenChartDataPoint[]
  tokenPieData: Array<{ name: string; value: number }>
}

/** Groups the request analysis section inputs. */
export interface DashboardRequestAnalysisSectionsViewModel {
  metrics: DashboardMetrics
  requestChartData: RequestChartDataPoint[]
  filteredData: DailyUsage[]
  filteredDailyData: DailyUsage[]
  viewMode: ViewMode
}

/** Groups the advanced analysis section inputs. */
export interface DashboardAdvancedAnalysisSectionsViewModel {
  metrics: DashboardMetrics
  filteredData: DailyUsage[]
  viewMode: ViewMode
}

/** Groups the comparison section inputs. */
export interface DashboardComparisonSectionsViewModel {
  metrics: DashboardMetrics
  filteredData: DailyUsage[]
  comparisonData: DailyUsage[]
  viewMode: ViewMode
}

/** Groups the table section inputs. */
export interface DashboardTablesSectionsViewModel {
  metrics: DashboardMetrics
  filteredData: DailyUsage[]
  modelCosts: Map<
    string,
    {
      cost: number
      tokens: number
      input: number
      output: number
      cacheRead: number
      cacheCreate: number
      thinking: number
      requests: number
      days: number
    }
  >
  providerMetrics: Map<string, AggregateMetrics>
  viewMode: ViewMode
}

/** Groups the section interaction callbacks. */
export interface DashboardSectionsInteractionsViewModel {
  onDrillDownDateChange: (date: string | null) => void
}

/** Describes the complete dashboard sections view-model contract. */
export interface DashboardSectionsViewModel {
  layout: DashboardSectionsLayoutViewModel
  overview: DashboardOverviewSectionsViewModel
  forecast: DashboardForecastSectionsViewModel
  limits: DashboardLimitsSectionsViewModel
  costAnalysis: DashboardCostAnalysisSectionsViewModel
  tokenAnalysis: DashboardTokenAnalysisSectionsViewModel
  requestAnalysis: DashboardRequestAnalysisSectionsViewModel
  advancedAnalysis: DashboardAdvancedAnalysisSectionsViewModel
  comparisons: DashboardComparisonSectionsViewModel
  tables: DashboardTablesSectionsViewModel
  interactions: DashboardSectionsInteractionsViewModel
}
