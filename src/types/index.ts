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
  /** Number of original days merged into this entry (1 for daily, N for monthly/yearly) */
  _aggregatedDays?: number
}

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

export interface UsageImportSummary {
  importedDays: number
  addedDays: number
  unchangedDays: number
  conflictingDays: number
  totalDays: number
}

export type AppLanguage = 'de' | 'en'

export type AppTheme = 'dark' | 'light'

export type ViewMode = 'daily' | 'monthly' | 'yearly'
export type DashboardDatePreset = 'all' | '7d' | '30d' | 'month' | 'year'
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

export interface DashboardDefaultFilters {
  viewMode: ViewMode
  datePreset: DashboardDatePreset
  providers: string[]
  models: string[]
}

export type DashboardSectionVisibility = Record<DashboardSectionId, boolean>
export type DashboardSectionOrder = DashboardSectionId[]

export interface DateRange {
  start: string
  end: string
}

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
  modelBreakdowns: Map<string, { cost: number; tokens: number; input: number; output: number; cacheRead: number; cacheCreate: number; thinking: number; requests: number }>
}

export interface ChartDataPoint {
  date: string
  cost: number
  costPrev?: number
  ma7?: number
  cumulative?: number
  [key: string]: unknown
}

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

export interface RequestChartDataPoint {
  date: string
  totalRequests: number
  totalRequestsPrev?: number
  totalRequestsMA7?: number
  [key: string]: unknown
}

export interface CacheHitRateByModelChartDataPoint {
  model: string
  totalRate: number
  trailing7Rate: number
  totalBaseTokens: number
  trailing7BaseTokens: number
}

export interface WeekdayData {
  day: string
  cost: number
}

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

export interface ProviderLimitConfig {
  hasSubscription: boolean
  subscriptionPrice: number
  monthlyLimit: number
}

export type ProviderLimits = Record<string, ProviderLimitConfig>

export type DataLoadSource = 'file' | 'auto-import' | 'cli-auto-load' | null

export interface AppSettings {
  language: AppLanguage
  theme: AppTheme
  providerLimits: ProviderLimits
  defaultFilters: DashboardDefaultFilters
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  lastLoadedAt: string | null
  lastLoadSource: DataLoadSource
  cliAutoLoadActive: boolean
}
