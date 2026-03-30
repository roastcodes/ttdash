export interface ModelBreakdown {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
}

export interface UsageData {
  daily: DailyUsage[]
  totals?: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    totalCost: number
    totalTokens: number
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
  cacheHitRate: number
  costPerMillion: number
  avgDailyCost: number
  topDay: { date: string; cost: number } | null
  cheapestDay: { date: string; cost: number } | null
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheCreate: number
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
  days: number
  modelBreakdowns: Map<string, { cost: number; tokens: number; input: number; output: number; cacheRead: number; cacheCreate: number }>
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
  tokenMA7?: number
  inputMA7?: number
  outputMA7?: number
  cacheWriteMA7?: number
  cacheReadMA7?: number
}

export interface WeekdayData {
  day: string
  cost: number
}
