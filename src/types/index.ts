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

export type ViewMode = 'daily' | 'monthly' | 'yearly'

export interface DateRange {
  start: string
  end: string
}

export interface DashboardMetrics {
  totalCost: number
  totalTokens: number
  activeDays: number
  topModel: { name: string; cost: number } | null
  topModelShare: number
  topThreeModelsShare: number
  topProvider: { name: string; cost: number; share: number } | null
  providerCount: number
  hasRequestData: boolean
  cacheHitRate: number
  costPerMillion: number
  avgTokensPerRequest: number
  avgCostPerRequest: number
  avgModelsPerDay: number
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
  totalRequestsMA7?: number
  [key: string]: unknown
}

export interface WeekdayData {
  day: string
  cost: number
}
