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
  _aggregatedDays?: number
}

/** Lists the supported dashboard aggregation modes. */
export type ViewMode = 'daily' | 'monthly' | 'yearly'

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
