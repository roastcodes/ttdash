const modelNormalizationSpec = require('./model-normalization.json')

const DISPLAY_ALIASES = modelNormalizationSpec.displayAliases.map((alias) => ({
  ...alias,
  matcher: new RegExp(alias.pattern, 'i'),
}))

const PROVIDER_MATCHERS = modelNormalizationSpec.providerMatchers.map((matcher) => ({
  ...matcher,
  matcher: new RegExp(matcher.pattern, 'i'),
}))

const TOKTRACK_PROVIDER_SUFFIXES = new Map([
  ['alibaba', 'Alibaba'],
  ['anthropic', 'Anthropic'],
  ['cohere', 'Cohere'],
  ['deepseek', 'DeepSeek'],
  ['google', 'Google'],
  ['mistral', 'Mistral'],
  ['opencode', 'OpenCode'],
  ['openai', 'OpenAI'],
  ['xai', 'xAI'],
  ['meta', 'Meta'],
])

function titleCaseSegment(segment) {
  if (!segment) return segment
  if (/^\d+([.-]\d+)*$/.test(segment)) return segment.replace(/-/g, '.')
  if (/^[a-z]{1,4}\d+$/i.test(segment)) return segment.toUpperCase()
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function capitalize(segment) {
  if (!segment) return ''
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function formatVersion(version) {
  return version.replace(/-/g, '.')
}

function splitToktrackProviderSuffix(raw) {
  const value = String(raw || '').trim()
  const match = value.match(/^(.*)::([a-z][a-z0-9_-]*)$/i)
  if (!match) {
    return { model: value, provider: null }
  }

  const model = match[1].trim()
  const provider = TOKTRACK_PROVIDER_SUFFIXES.get(match[2].toLowerCase()) ?? null
  if (!model || !provider) {
    return { model: value, provider: null }
  }

  return { model, provider }
}

function canonicalizeModelName(raw) {
  const { model } = splitToktrackProviderSuffix(raw)
  const normalized = model
    .toLowerCase()
    .replace(/^model[:/ -]*/i, '')
    .replace(/^(anthropic|openai|google|vertex|models)[/-]/i, '')
    .replace(/\./g, '-')
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  const suffixStart = normalized.lastIndexOf('-')
  if (suffixStart > 0) {
    const suffix = normalized.slice(suffixStart + 1)
    if (suffix.length === 8 && suffix.startsWith('20') && /^\d+$/.test(suffix)) {
      return normalized.slice(0, suffixStart)
    }
  }

  return normalized
}

function parseClaudeName(rest) {
  const parts = rest.split('-')
  if (parts.length < 2) {
    return `Claude ${capitalize(rest)}`
  }

  const family = capitalize(parts[0] || '')
  const secondPart = parts[1] || ''

  if (/^\d+$/.test(secondPart)) {
    const version = formatVersion(parts.slice(1).join('-'))
    return ['Claude', family, version].filter(Boolean).join(' ').trim()
  }

  const model = capitalize(secondPart)
  const version = formatVersion(parts.slice(2).join('-'))

  return ['Claude', family, model, version].filter(Boolean).join(' ').trim()
}

function parseGptName(rest) {
  const parts = rest.split('-')
  const variant = parts[0] || ''
  const minor = parts[1] || ''

  if (minor && minor.length <= 2 && /^\d+$/.test(minor)) {
    const version = `${variant}.${minor}`
    if (parts.length > 2) {
      const suffix = parts.slice(2).map(capitalize).join(' ')
      return `GPT-${version}${suffix ? ` ${suffix}` : ''}`
    }
    return `GPT-${version}`
  }

  if (parts.length > 1) {
    const suffix = parts.slice(1).map(capitalize).join(' ')
    return `GPT-${variant}${suffix ? ` ${suffix}` : ''}`
  }

  return `GPT-${rest}`
}

function parseGeminiName(rest) {
  const parts = rest.split('-')
  if (parts.length < 2) {
    return `Gemini ${rest}`
  }

  const versionParts = []
  const tierParts = []

  for (const part of parts) {
    if (/^\d+$/.test(part) && tierParts.length === 0) {
      versionParts.push(part)
    } else {
      tierParts.push(capitalize(part))
    }
  }

  const version = versionParts.join('.')
  const tier = tierParts.join(' ')

  return tier ? `Gemini ${version} ${tier}` : `Gemini ${version}`
}

function parseCodexName(rest) {
  const normalized = rest.replace(/-latest$/i, '')
  if (!normalized) {
    return 'Codex'
  }

  return `Codex ${normalized.split('-').map(capitalize).join(' ')}`
}

function parseOSeries(name) {
  const separatorIndex = name.indexOf('-')
  if (separatorIndex === -1) {
    return name
  }

  return `${name.slice(0, separatorIndex)} ${capitalize(name.slice(separatorIndex + 1))}`
}

/**
 * Normalizes raw model names to their dashboard label.
 *
 * @param raw - The raw model identifier.
 * @returns The normalized display name.
 */
function normalizeModelName(raw) {
  const canonical = canonicalizeModelName(raw)

  if (canonical.startsWith('claude-')) {
    return parseClaudeName(canonical.slice('claude-'.length))
  }

  for (const alias of DISPLAY_ALIASES) {
    if (alias.matcher.test(canonical)) return alias.name
  }

  if (canonical.startsWith('gpt-')) {
    return parseGptName(canonical.slice('gpt-'.length))
  }

  if (canonical.startsWith('gemini-')) {
    return parseGeminiName(canonical.slice('gemini-'.length))
  }

  if (canonical.startsWith('codex-')) {
    return parseCodexName(canonical.slice('codex-'.length))
  }

  if (/^o\d/i.test(canonical)) {
    return parseOSeries(canonical)
  }

  const familyMatch = canonical.match(
    /^(gpt|opus|sonnet|haiku|gemini|codex|o\d|oai|grok|llama|mistral|command|deepseek|qwen)(?:-([a-z0-9-]+))?$/i,
  )
  if (familyMatch) {
    const family = familyMatch[1]
    if (/^codex$/i.test(family)) {
      return parseCodexName(familyMatch[2] || '')
    }

    if (/^(o\d)$/i.test(family)) return parseOSeries(canonical)

    const suffix = familyMatch[2] ? formatVersion(familyMatch[2]) : ''
    if (/^gpt$/i.test(family) && suffix) return `GPT-${suffix.toUpperCase()}`
    return `${titleCaseSegment(family)}${suffix ? ` ${suffix}` : ''}`.trim()
  }

  return canonical.split('-').filter(Boolean).map(titleCaseSegment).join(' ') || String(raw || '')
}

/**
 * Resolves the provider name for a model identifier.
 *
 * @param raw - The raw model identifier.
 * @returns The normalized provider name.
 */
function getModelProvider(raw) {
  const suffixProvider = splitToktrackProviderSuffix(raw).provider
  if (suffixProvider) return suffixProvider

  const canonical = canonicalizeModelName(raw)
  for (const matcher of PROVIDER_MATCHERS) {
    if (matcher.matcher.test(canonical)) return matcher.provider
  }
  return 'Other'
}

function recalculateDayFromBreakdowns(day, filteredBreakdowns) {
  let totalCost = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let thinkingTokens = 0
  let requestCount = 0

  for (const breakdown of filteredBreakdowns) {
    totalCost += breakdown.cost
    inputTokens += breakdown.inputTokens
    outputTokens += breakdown.outputTokens
    cacheCreationTokens += breakdown.cacheCreationTokens
    cacheReadTokens += breakdown.cacheReadTokens
    thinkingTokens += breakdown.thinkingTokens
    requestCount += breakdown.requestCount
  }

  return {
    ...day,
    totalCost,
    totalTokens:
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    requestCount,
    modelBreakdowns: filteredBreakdowns,
    modelsUsed: [
      ...new Set(filteredBreakdowns.map((breakdown) => normalizeModelName(breakdown.modelName))),
    ],
  }
}

/**
 * Filters usage rows by an inclusive ISO date range.
 *
 * @param data - The source usage rows.
 * @param start - The optional start date.
 * @param end - The optional end date.
 * @returns The filtered usage rows.
 */
function filterByDateRange(data, start, end) {
  return data.filter((entry) => {
    if (start && entry.date < start) return false
    if (end && entry.date > end) return false
    return true
  })
}

/**
 * Filters usage rows to entries that contain selected models.
 *
 * @param data - The source usage rows.
 * @param selectedModels - The normalized model names to keep.
 * @returns The filtered usage rows.
 */
function filterByModels(data, selectedModels) {
  if (!selectedModels || selectedModels.length === 0) return data
  const selected = new Set(selectedModels)

  return data
    .map((entry) => {
      const filteredBreakdowns = entry.modelBreakdowns.filter((breakdown) =>
        selected.has(normalizeModelName(breakdown.modelName)),
      )

      if (filteredBreakdowns.length === 0) return null
      return recalculateDayFromBreakdowns(entry, filteredBreakdowns)
    })
    .filter(Boolean)
}

/**
 * Filters usage rows to entries that contain selected providers.
 *
 * @param data - The source usage rows.
 * @param selectedProviders - The provider names to keep.
 * @returns The filtered usage rows.
 */
function filterByProviders(data, selectedProviders) {
  if (!selectedProviders || selectedProviders.length === 0) return data
  const selected = new Set(selectedProviders)

  return data
    .map((entry) => {
      const filteredBreakdowns = entry.modelBreakdowns.filter((breakdown) =>
        selected.has(getModelProvider(breakdown.modelName)),
      )

      if (filteredBreakdowns.length === 0) return null
      return recalculateDayFromBreakdowns(entry, filteredBreakdowns)
    })
    .filter(Boolean)
}

/**
 * Filters usage rows to a specific calendar month.
 *
 * @param data - The source usage rows.
 * @param month - The month in YYYY-MM format.
 * @returns The filtered usage rows.
 */
function filterByMonth(data, month) {
  if (!month) return data
  return data.filter((entry) => entry.date.startsWith(month))
}

/**
 * Sorts usage rows in ascending date order.
 *
 * @param data - The source usage rows.
 * @returns A date-sorted copy of the input.
 */
function sortByDate(data) {
  return [...data].sort((left, right) => left.date.localeCompare(right.date))
}

/**
 * Aggregates usage rows to the requested dashboard view mode.
 *
 * @param data - The source daily usage rows.
 * @param viewMode - The target aggregation mode.
 * @returns The aggregated usage rows.
 */
function aggregateToDailyFormat(data, viewMode) {
  if (viewMode === 'daily') return data

  const getGroupKey =
    viewMode === 'monthly' ? (date) => date.slice(0, 7) : (date) => date.slice(0, 4)
  const groups = new Map()

  for (const day of data) {
    const key = getGroupKey(day.date)
    const existing = groups.get(key)
    const aggregatedDays = day._aggregatedDays || 1

    if (!existing) {
      groups.set(key, {
        ...day,
        date: key,
        _aggregatedDays: aggregatedDays,
      })
      continue
    }

    existing.totalCost += day.totalCost
    existing.totalTokens += day.totalTokens
    existing.inputTokens += day.inputTokens
    existing.outputTokens += day.outputTokens
    existing.cacheCreationTokens += day.cacheCreationTokens
    existing.cacheReadTokens += day.cacheReadTokens
    existing.thinkingTokens += day.thinkingTokens
    existing.requestCount += day.requestCount
    existing._aggregatedDays += aggregatedDays
    existing.modelBreakdowns = existing.modelBreakdowns.concat(day.modelBreakdowns)
    existing.modelsUsed = Array.from(new Set(existing.modelsUsed.concat(day.modelsUsed)))
  }

  return Array.from(groups.values()).sort((left, right) => left.date.localeCompare(right.date))
}

/**
 * Computes a simple moving average over numeric values.
 *
 * @param values - The source numeric values.
 * @param window - The moving average window size.
 * @returns The moving-average series.
 */
function computeMovingAverage(values, window = 7) {
  const result = Array(values.length)
  let sum = 0
  let definedCount = 0

  for (let index = 0; index < values.length; index += 1) {
    const currentValue = values[index]
    if (currentValue !== undefined) {
      sum += currentValue
      definedCount += 1
    }

    if (index >= window) {
      const outgoingValue = values[index - window]
      if (outgoingValue !== undefined) {
        sum -= outgoingValue
        definedCount -= 1
      }
    }

    result[index] =
      index < window - 1 ? undefined : definedCount > 0 ? sum / definedCount : undefined
  }

  return result
}

function stdDev(values) {
  if (!values.length) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Returns the busiest rolling seven-day window by cost.
 *
 * @param data - The source usage rows.
 * @returns The top seven-day window or null when unavailable.
 */
function computeBusiestWeek(data) {
  const sorted = data
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((left, right) => left.date.localeCompare(right.date))

  if (sorted.length < 3) return null

  let bestWindow = null

  for (let start = 0; start < sorted.length; start += 1) {
    const startEntry = sorted[start]
    if (!startEntry) continue

    const startDate = new Date(`${startEntry.date}T00:00:00`)
    const endLimit = new Date(startDate)
    endLimit.setDate(endLimit.getDate() + 6)
    let windowCost = 0
    let end = start

    while (end < sorted.length) {
      const endEntry = sorted[end]
      if (!endEntry) break
      if (new Date(`${endEntry.date}T00:00:00`) > endLimit) break
      windowCost += endEntry.totalCost
      end += 1
    }

    const finalEntry = sorted[end - 1]
    if (finalEntry && (!bestWindow || windowCost > bestWindow.cost)) {
      bestWindow = {
        start: startEntry.date,
        end: finalEntry.date,
        cost: windowCost,
      }
    }
  }

  return bestWindow
}

/**
 * Computes the relative week-over-week cost change.
 *
 * @param data - The source usage rows.
 * @returns The relative week-over-week delta.
 */
function computeWeekOverWeekChange(data) {
  if (data.some((entry) => !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))) return null
  if (data.length < 14) return null
  const sorted = sortByDate(data)
  const last7 = sorted.slice(-7)
  const prev7 = sorted.slice(-14, -7)
  const lastSum = last7.reduce((sum, day) => sum + day.totalCost, 0)
  const prevSum = prev7.reduce((sum, day) => sum + day.totalCost, 0)
  if (prevSum === 0) return null
  return ((lastSum - prevSum) / prevSum) * 100
}

/**
 * Computes the core dashboard metrics for a dataset.
 *
 * @param data - The source usage rows.
 * @returns The derived dashboard metrics.
 */
function computeMetrics(data) {
  if (data.length === 0) {
    return {
      totalCost: 0,
      totalTokens: 0,
      activeDays: 0,
      topModel: null,
      topRequestModel: null,
      topTokenModel: null,
      topModelShare: 0,
      topThreeModelsShare: 0,
      topProvider: null,
      providerCount: 0,
      hasRequestData: false,
      cacheHitRate: 0,
      costPerMillion: 0,
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      avgModelsPerEntry: 0,
      avgDailyCost: 0,
      avgRequestsPerDay: 0,
      topDay: null,
      cheapestDay: null,
      busiestWeek: null,
      weekendCostShare: null,
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreate: 0,
      totalThinking: 0,
      totalRequests: 0,
      weekOverWeekChange: null,
      requestVolatility: 0,
      modelConcentrationIndex: 0,
      providerConcentrationIndex: 0,
    }
  }

  const firstDay = data[0]
  let topDay = { date: firstDay.date, cost: firstDay.totalCost }
  let cheapestDay = { date: firstDay.date, cost: firstDay.totalCost }
  let totalCost = 0
  let totalTokens = 0
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreate = 0
  let totalThinking = 0
  let totalRequests = 0
  let activeDays = 0
  let hasRequestData = false
  let totalModelsUsed = 0
  let weekendCost = 0
  let weekendEligible = 0
  const modelCosts = new Map()
  const modelTokens = new Map()
  const modelRequests = new Map()
  const providerCosts = new Map()

  for (const day of data) {
    totalCost += day.totalCost
    totalTokens += day.totalTokens
    totalInput += day.inputTokens
    totalOutput += day.outputTokens
    totalCacheRead += day.cacheReadTokens
    totalCacheCreate += day.cacheCreationTokens
    totalThinking += day.thinkingTokens
    totalRequests += day.requestCount
    if (
      day.requestCount > 0 ||
      day.modelBreakdowns.some((breakdown) => breakdown.requestCount > 0)
    ) {
      hasRequestData = true
    }
    activeDays += day._aggregatedDays || 1
    totalModelsUsed += day.modelsUsed.length

    if (/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      const weekday = new Date(`${day.date}T00:00:00`).getDay()
      if (weekday === 0 || weekday === 6) weekendCost += day.totalCost
      weekendEligible += day.totalCost
    }

    if (day.totalCost > topDay.cost) topDay = { date: day.date, cost: day.totalCost }
    if (day.totalCost < cheapestDay.cost) cheapestDay = { date: day.date, cost: day.totalCost }

    for (const breakdown of day.modelBreakdowns) {
      const normalizedName = normalizeModelName(breakdown.modelName)
      const totalBreakdownTokens =
        breakdown.inputTokens +
        breakdown.outputTokens +
        breakdown.cacheCreationTokens +
        breakdown.cacheReadTokens +
        breakdown.thinkingTokens

      modelCosts.set(normalizedName, (modelCosts.get(normalizedName) || 0) + breakdown.cost)
      modelTokens.set(normalizedName, (modelTokens.get(normalizedName) || 0) + totalBreakdownTokens)
      modelRequests.set(
        normalizedName,
        (modelRequests.get(normalizedName) || 0) + breakdown.requestCount,
      )

      const provider = getModelProvider(breakdown.modelName)
      providerCosts.set(provider, (providerCosts.get(provider) || 0) + breakdown.cost)
    }
  }

  const avgDailyCost = totalCost / activeDays
  const avgRequestsPerDay = hasRequestData && activeDays > 0 ? totalRequests / activeDays : 0
  const costPerMillion = totalTokens > 0 ? totalCost / (totalTokens / 1_000_000) : 0
  const avgTokensPerRequest = hasRequestData && totalRequests > 0 ? totalTokens / totalRequests : 0
  const avgCostPerRequest = hasRequestData && totalRequests > 0 ? totalCost / totalRequests : 0
  const avgModelsPerEntry = data.length > 0 ? totalModelsUsed / data.length : 0
  const cacheBase = totalCacheRead + totalCacheCreate + totalInput + totalOutput + totalThinking
  const cacheHitRate = cacheBase > 0 ? (totalCacheRead / cacheBase) * 100 : 0

  let topModel = null
  for (const [name, cost] of modelCosts) {
    if (!topModel || cost > topModel.cost) topModel = { name, cost }
  }

  let topRequestModel = null
  for (const [name, requests] of modelRequests) {
    if (!topRequestModel || requests > topRequestModel.requests) {
      topRequestModel = { name, requests }
    }
  }

  let topTokenModel = null
  for (const [name, tokens] of modelTokens) {
    if (!topTokenModel || tokens > topTokenModel.tokens) topTokenModel = { name, tokens }
  }

  const topModelShare = topModel && totalCost > 0 ? (topModel.cost / totalCost) * 100 : 0
  const topThreeModelsShare =
    totalCost > 0
      ? ([...modelCosts.values()]
          .sort((left, right) => right - left)
          .slice(0, 3)
          .reduce((sum, value) => sum + value, 0) /
          totalCost) *
        100
      : 0

  let topProvider = null
  for (const [name, cost] of providerCosts) {
    if (!topProvider || cost > topProvider.cost) {
      topProvider = { name, cost, share: totalCost > 0 ? (cost / totalCost) * 100 : 0 }
    }
  }

  const requestValues = data.map((entry) => entry.requestCount)
  const requestVolatility = stdDev(requestValues)
  const modelConcentrationIndex =
    totalCost > 0
      ? [...modelCosts.values()].reduce((sum, cost) => {
          const share = cost / totalCost
          return sum + share * share
        }, 0)
      : 0
  const providerConcentrationIndex =
    totalCost > 0
      ? [...providerCosts.values()].reduce((sum, cost) => {
          const share = cost / totalCost
          return sum + share * share
        }, 0)
      : 0

  return {
    totalCost,
    totalTokens,
    activeDays,
    topModel,
    topRequestModel,
    topTokenModel,
    topModelShare,
    topThreeModelsShare,
    topProvider,
    providerCount: providerCosts.size,
    hasRequestData,
    cacheHitRate,
    costPerMillion,
    avgTokensPerRequest,
    avgCostPerRequest,
    avgModelsPerEntry,
    avgDailyCost,
    avgRequestsPerDay,
    topDay,
    cheapestDay,
    busiestWeek: computeBusiestWeek(data),
    weekendCostShare: weekendEligible > 0 ? (weekendCost / weekendEligible) * 100 : null,
    totalInput,
    totalOutput,
    totalCacheRead,
    totalCacheCreate,
    totalThinking,
    totalRequests,
    weekOverWeekChange: computeWeekOverWeekChange(data),
    requestVolatility,
    modelConcentrationIndex,
    providerConcentrationIndex,
  }
}

module.exports = {
  aggregateToDailyFormat,
  computeBusiestWeek,
  computeMetrics,
  computeMovingAverage,
  computeWeekOverWeekChange,
  filterByDateRange,
  filterByModels,
  filterByMonth,
  filterByProviders,
  getModelProvider,
  normalizeModelName,
  sortByDate,
}
