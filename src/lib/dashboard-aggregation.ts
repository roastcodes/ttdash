import type { AggregateMetrics, DailyUsage } from '@/types'
import { getModelProvider, normalizeModelName } from '../../shared/dashboard-domain.js'

interface MutableAggregateMetrics extends AggregateMetrics {
  dates: Set<string>
}

/** Describes reusable breakdown aggregates for dashboard metrics and tables. */
export interface DashboardBreakdownSummary {
  modelCosts: Map<string, AggregateMetrics>
  providerMetrics: Map<string, AggregateMetrics>
  allModels: string[]
}

function createMutableAggregate(): MutableAggregateMetrics {
  return {
    cost: 0,
    tokens: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreate: 0,
    thinking: 0,
    requests: 0,
    days: 0,
    dates: new Set<string>(),
  }
}

function addBreakdownToAggregate(
  aggregate: MutableAggregateMetrics,
  date: string,
  entryDays: number,
  breakdown: DailyUsage['modelBreakdowns'][number],
) {
  aggregate.cost += breakdown.cost
  aggregate.input += breakdown.inputTokens
  aggregate.output += breakdown.outputTokens
  aggregate.cacheRead += breakdown.cacheReadTokens
  aggregate.cacheCreate += breakdown.cacheCreationTokens
  aggregate.thinking += breakdown.thinkingTokens
  aggregate.requests += breakdown.requestCount
  aggregate.tokens +=
    breakdown.inputTokens +
    breakdown.outputTokens +
    breakdown.cacheReadTokens +
    breakdown.cacheCreationTokens +
    breakdown.thinkingTokens

  if (!aggregate.dates.has(date)) {
    aggregate.dates.add(date)
    aggregate.days += entryDays
  }
}

function finalizeAggregateMap(
  source: Map<string, MutableAggregateMetrics>,
): Map<string, AggregateMetrics> {
  return new Map(
    Array.from(source.entries()).map(([name, value]) => [
      name,
      {
        cost: value.cost,
        tokens: value.tokens,
        input: value.input,
        output: value.output,
        cacheRead: value.cacheRead,
        cacheCreate: value.cacheCreate,
        thinking: value.thinking,
        requests: value.requests,
        days: value.days,
      },
    ]),
  )
}

/** Builds provider, model, and model-option aggregates from one breakdown pass. */
export function summarizeUsageBreakdowns(data: DailyUsage[]): DashboardBreakdownSummary {
  const modelCosts = new Map<string, MutableAggregateMetrics>()
  const providerMetrics = new Map<string, MutableAggregateMetrics>()
  const allModels = new Set<string>()

  for (const day of data) {
    const entryDays = day._aggregatedDays ?? 1

    for (const model of day.modelsUsed) {
      allModels.add(normalizeModelName(model))
    }

    for (const breakdown of day.modelBreakdowns) {
      const modelName = normalizeModelName(breakdown.modelName)
      const provider = getModelProvider(breakdown.modelName)
      const modelAggregate = modelCosts.get(modelName) ?? createMutableAggregate()
      const providerAggregate = providerMetrics.get(provider) ?? createMutableAggregate()

      allModels.add(modelName)
      addBreakdownToAggregate(modelAggregate, day.date, entryDays, breakdown)
      addBreakdownToAggregate(providerAggregate, day.date, entryDays, breakdown)

      modelCosts.set(modelName, modelAggregate)
      providerMetrics.set(provider, providerAggregate)
    }
  }

  return {
    modelCosts: finalizeAggregateMap(modelCosts),
    providerMetrics: finalizeAggregateMap(providerMetrics),
    allModels: Array.from(allModels).sort(),
  }
}
