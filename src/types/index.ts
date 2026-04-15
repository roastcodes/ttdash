/** Describes per-model usage totals for one period. */
export interface ModelBreakdown {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  thinkingTokens: number
  cost: number
  requestCount: number
}

/** Describes aggregated usage for one daily, monthly, or yearly period. */
export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  thinkingTokens: number
  totalTokens: number
  totalCost: number
  requestCount: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
  /** Number of original days merged into this entry (1 for daily, N for monthly/yearly). */
  _aggregatedDays?: number
}

/** Describes the persisted usage payload returned by the API. */
export interface UsageData {
  daily: DailyUsage[]
  totals?: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    thinkingTokens: number
    totalCost: number
    totalTokens: number
    requestCount: number
  }
}

/** Summarizes the result of a usage import operation. */
export interface UsageImportSummary {
  importedDays: number
  addedDays: number
  unchangedDays: number
  conflictingDays: number
  totalDays: number
}

/** Lists the languages supported by the app. */
export type AppLanguage = 'de' | 'en'

/** Lists the available visual themes. */
export type AppTheme = 'dark' | 'light'
/** Controls whether the app follows, forces, or disables reduced motion. */
export type ReducedMotionPreference = 'system' | 'always' | 'never'

/** Lists the supported dashboard aggregation modes. */
export type ViewMode = 'daily' | 'monthly' | 'yearly'
/** Lists the supported dashboard date presets. */
export type DashboardDatePreset = 'all' | '7d' | '30d' | 'month' | 'year'
/** Identifies one configurable dashboard section. */
export type DashboardSectionId =
  | 'insights'
  | 'metrics'
  | 'today'
  | 'currentMonth'
  | 'activity'
  | 'forecastCache'
  | 'limits'
  | 'costAnalysis'
  | 'tokenAnalysis'
  | 'requestAnalysis'
  | 'advancedAnalysis'
  | 'comparisons'
  | 'tables'

/** Stores the persisted default dashboard filters. */
export interface DashboardDefaultFilters {
  viewMode: ViewMode
  datePreset: DashboardDatePreset
  providers: string[]
  models: string[]
}

/** Stores per-section visibility state for the dashboard. */
export type DashboardSectionVisibility = Record<DashboardSectionId, boolean>
/** Stores the persisted section order for the dashboard. */
export type DashboardSectionOrder = DashboardSectionId[]

/** Describes an inclusive dashboard date range. */
export interface DateRange {
  start: string
  end: string
}

/** Collects high-level metrics derived from the current dataset. */
export interface DashboardMetrics {
  totalCost: number
  totalTokens: number
  activeDays: number
  topModel: { name: string; cost: number } | null
  topRequestModel: { name: string; requests: number } | null
  topTokenModel: { name: string; tokens: number } | null
  topModelShare: number
  topThreeModelsShare: number
  topProvider: { name: string; cost: number; share: number } | null
  providerCount: number
  hasRequestData: boolean
  cacheHitRate: number
  costPerMillion: number
  avgTokensPerRequest: number
  avgCostPerRequest: number
  avgModelsPerEntry: number
  avgDailyCost: number
  avgRequestsPerDay: number
  topDay: { date: string; cost: number } | null
  cheapestDay: { date: string; cost: number } | null
  busiestWeek: { start: string; end: string; cost: number } | null
  weekendCostShare: number | null
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheCreate: number
  totalThinking: number
  totalRequests: number
  weekOverWeekChange: number | null
  requestVolatility: number
  modelConcentrationIndex: number
  providerConcentrationIndex: number
}

/** Describes one aggregated period built from multiple daily rows. */
export interface AggregatedPeriod {
  period: string
  label: string
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  thinkingTokens: number
  requestCount: number
  days: number
  modelBreakdowns: Map<
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
    }
  >
}

/** Describes one point in a cost-oriented chart series. */
export interface ChartDataPoint {
  date: string
  cost: number
  costPrev?: number
  ma7?: number
  cumulative?: number
  [key: string]: unknown
}

/** Describes one point in the token composition chart series. */
export interface TokenChartDataPoint {
  date: string
  Input: number
  Output: number
  'Cache Write': number
  'Cache Read': number
  Thinking: number
  totalTokens: number
  totalTokensPrev?: number
  tokenMA7?: number
  inputMA7?: number
  outputMA7?: number
  cacheWriteMA7?: number
  cacheReadMA7?: number
  thinkingMA7?: number
}

/** Describes one point in the request volume chart series. */
export interface RequestChartDataPoint {
  date: string
  totalRequests: number
  totalRequestsPrev?: number
  totalRequestsMA7?: number
  [key: string]: unknown
}

/** Describes cache hit-rate metrics grouped by model. */
export interface CacheHitRateByModelChartDataPoint {
  model: string
  totalRate: number
  trailing7Rate: number
  totalBaseTokens: number
  trailing7BaseTokens: number
}

/** Describes one cost bucket in the weekday chart. */
export interface WeekdayData {
  day: string
  cost: number
}

/** Collects aggregate metrics for one model or provider. */
export interface AggregateMetrics {
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

/** Describes subscription and limit settings for one provider. */
export interface ProviderLimitConfig {
  hasSubscription: boolean
  subscriptionPrice: number
  monthlyLimit: number
}

/** Maps provider ids to their limit configuration. */
export type ProviderLimits = Record<string, ProviderLimitConfig>

/** Identifies where the current dataset was loaded from. */
export type DataLoadSource = 'file' | 'auto-import' | 'cli-auto-load' | null

/** Stores the persisted application settings. */
export interface AppSettings {
  language: AppLanguage
  theme: AppTheme
  reducedMotionPreference: ReducedMotionPreference
  providerLimits: ProviderLimits
  defaultFilters: DashboardDefaultFilters
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  lastLoadedAt: string | null
  lastLoadSource: DataLoadSource
  cliAutoLoadActive: boolean
}
