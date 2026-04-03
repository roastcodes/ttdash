const { version: APP_VERSION } = require('../../package.json');

const MODEL_COLORS = {
  'Opus 4.6': 'rgb(175, 92, 224)',
  'Opus 4.5': 'rgb(200, 66, 111)',
  'Sonnet 4.6': 'rgb(71, 134, 221)',
  'Sonnet 4.5': 'rgb(66, 161, 130)',
  'Haiku 4.5': 'rgb(231, 146, 34)',
  'GPT-5.4': 'rgb(230, 98, 56)',
  'GPT-5': 'rgb(230, 98, 56)',
  'Gemini 3 Flash Preview': 'rgb(237, 188, 8)',
  'Gemini': 'rgb(237, 188, 8)',
  'OpenCode': 'rgb(51, 181, 193)',
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function titleCaseSegment(segment) {
  if (!segment) return segment;
  if (/^\d+([.-]\d+)*$/.test(segment)) return segment.replace(/-/g, '.');
  if (/^[a-z]{1,4}\d+$/i.test(segment)) return segment.toUpperCase();
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function normalizeModelName(raw) {
  const lower = String(raw || '').toLowerCase().trim();
  if (lower.includes('gpt-5-4') || lower.includes('gpt-5.4')) return 'GPT-5.4';
  if (lower.includes('gpt-5')) return 'GPT-5';
  if (lower.includes('opus-4-6') || lower.includes('opus-4.6')) return 'Opus 4.6';
  if (lower.includes('opus-4-5') || lower.includes('opus-4.5')) return 'Opus 4.5';
  if (lower.includes('sonnet-4-6') || lower.includes('sonnet-4.6')) return 'Sonnet 4.6';
  if (lower.includes('sonnet-4-5') || lower.includes('sonnet-4.5')) return 'Sonnet 4.5';
  if (lower.includes('haiku-4-5') || lower.includes('haiku-4.5')) return 'Haiku 4.5';
  if (lower.includes('gemini-3-flash-preview')) return 'Gemini 3 Flash Preview';
  if (lower.includes('gemini')) return 'Gemini';
  if (lower.includes('opencode')) return 'OpenCode';
  if (lower.includes('haiku')) return 'Haiku';

  const stripped = String(raw || '')
    .trim()
    .replace(/^(claude|anthropic|openai|google|vertex|models)\//i, '')
    .replace(/^(claude|anthropic|openai|google|vertex|models)-/i, '')
    .replace(/^model[:/ -]*/i, '')
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  const familyMatch = stripped.match(/(gpt|opus|sonnet|haiku|gemini|o\d|oai|grok|llama|mistral|command|deepseek|qwen)[- ]?([a-z0-9.-]+)?/i);
  if (familyMatch) {
    const family = familyMatch[1];
    const suffix = familyMatch[2] ? familyMatch[2].replace(/-/g, '.') : '';
    if (/^gpt$/i.test(family) && suffix) return `GPT-${suffix.toUpperCase()}`;
    if (/^(o\d)$/i.test(family)) return family.toUpperCase();
    return `${titleCaseSegment(family)}${suffix ? ` ${suffix}` : ''}`.trim();
  }

  return stripped
    .split('-')
    .filter(Boolean)
    .map(titleCaseSegment)
    .join(' ') || String(raw || '');
}

function getModelProvider(raw) {
  const lower = String(raw || '').toLowerCase();
  if (lower.includes('gpt') || lower.includes('openai') || lower.includes('/o1') || lower.includes('/o3') || /\bo\d\b/.test(lower)) return 'OpenAI';
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) return 'Anthropic';
  if (lower.includes('gemini')) return 'Google';
  if (lower.includes('grok') || lower.includes('xai')) return 'xAI';
  if (lower.includes('llama') || lower.includes('meta-llama') || lower.includes('meta/')) return 'Meta';
  if (lower.includes('command') || lower.includes('cohere')) return 'Cohere';
  if (lower.includes('mistral')) return 'Mistral';
  if (lower.includes('deepseek')) return 'DeepSeek';
  if (lower.includes('qwen') || lower.includes('alibaba')) return 'Alibaba';
  if (lower.includes('opencode')) return 'OpenCode';
  return 'Other';
}

function getModelColor(name) {
  return MODEL_COLORS[name] || 'rgb(113, 128, 150)';
}

function sortByDate(data) {
  return [...data].sort((a, b) => a.date.localeCompare(b.date));
}

function filterByDateRange(data, start, end) {
  return data.filter((day) => {
    if (start && day.date < start) return false;
    if (end && day.date > end) return false;
    return true;
  });
}

function filterByMonth(data, month) {
  if (!month) return data;
  return data.filter((day) => day.date.startsWith(month));
}

function recalculateDayFromBreakdowns(day, modelBreakdowns) {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let thinkingTokens = 0;
  let totalCost = 0;
  let requestCount = 0;

  for (const breakdown of modelBreakdowns) {
    inputTokens += breakdown.inputTokens;
    outputTokens += breakdown.outputTokens;
    cacheCreationTokens += breakdown.cacheCreationTokens;
    cacheReadTokens += breakdown.cacheReadTokens;
    thinkingTokens += breakdown.thinkingTokens;
    totalCost += breakdown.cost;
    requestCount += breakdown.requestCount;
  }

  return {
    ...day,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    thinkingTokens,
    totalCost,
    requestCount,
    totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens + thinkingTokens,
    modelsUsed: modelBreakdowns.map((item) => item.modelName),
    modelBreakdowns,
  };
}

function filterByProviders(data, selectedProviders) {
  if (!selectedProviders || selectedProviders.length === 0) return data;
  const selected = new Set(selectedProviders);
  return data
    .map((day) => {
      const filteredBreakdowns = day.modelBreakdowns.filter((entry) => selected.has(getModelProvider(entry.modelName)));
      return filteredBreakdowns.length > 0 ? recalculateDayFromBreakdowns(day, filteredBreakdowns) : null;
    })
    .filter(Boolean);
}

function filterByModels(data, selectedModels) {
  if (!selectedModels || selectedModels.length === 0) return data;
  const selected = new Set(selectedModels);
  return data
    .map((day) => {
      const filteredBreakdowns = day.modelBreakdowns.filter((entry) => selected.has(normalizeModelName(entry.modelName)));
      return filteredBreakdowns.length > 0 ? recalculateDayFromBreakdowns(day, filteredBreakdowns) : null;
    })
    .filter(Boolean);
}

function aggregateToDailyFormat(data, viewMode) {
  if (viewMode === 'daily') return data;
  const groupKey = viewMode === 'monthly'
    ? (date) => date.slice(0, 7)
    : (date) => date.slice(0, 4);
  const groups = new Map();

  for (const day of data) {
    const key = groupKey(day.date);
    const existing = groups.get(key);
    const days = day._aggregatedDays || 1;

    if (!existing) {
      groups.set(key, {
        ...day,
        date: key,
        _aggregatedDays: days,
      });
      continue;
    }

    existing.totalCost += day.totalCost;
    existing.totalTokens += day.totalTokens;
    existing.inputTokens += day.inputTokens;
    existing.outputTokens += day.outputTokens;
    existing.cacheCreationTokens += day.cacheCreationTokens;
    existing.cacheReadTokens += day.cacheReadTokens;
    existing.thinkingTokens += day.thinkingTokens;
    existing.requestCount += day.requestCount;
    existing._aggregatedDays += days;
    existing.modelBreakdowns = existing.modelBreakdowns.concat(day.modelBreakdowns);
    existing.modelsUsed = Array.from(new Set(existing.modelsUsed.concat(day.modelsUsed)));
  }

  return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function computeMovingAverage(values, window = 7) {
  const result = new Array(values.length);
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= window) sum -= values[index - window];
    result[index] = index < window - 1 ? null : sum / window;
  }
  return result;
}

function toCostChartData(data) {
  const sorted = sortByDate(data);
  const ma7 = computeMovingAverage(sorted.map((day) => day.totalCost));
  let cumulative = 0;
  return sorted.map((day, index) => {
    cumulative += day.totalCost;
    return {
      date: day.date,
      cost: day.totalCost,
      cumulative,
      ma7: ma7[index],
    };
  });
}

function toTokenChartData(data) {
  return sortByDate(data).map((day) => ({
    date: day.date,
    input: day.inputTokens,
    output: day.outputTokens,
    cacheWrite: day.cacheCreationTokens,
    cacheRead: day.cacheReadTokens,
    thinking: day.thinkingTokens,
    total: day.totalTokens,
  }));
}

function toWeekdayData(data) {
  const weekdayCosts = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const day of data) {
    if (day.date.length !== 10) continue;
    const weekday = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7;
    weekdayCosts[weekday].push(day.totalCost);
  }
  return WEEKDAYS.map((label, index) => {
    const values = weekdayCosts[index];
    const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { day: label, cost: average };
  });
}

function stdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeWeekOverWeekChange(data) {
  if (data.length < 14) return null;
  const sorted = sortByDate(data);
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);
  const lastSum = last7.reduce((sum, day) => sum + day.totalCost, 0);
  const prevSum = prev7.reduce((sum, day) => sum + day.totalCost, 0);
  if (prevSum === 0) return null;
  return ((lastSum - prevSum) / prevSum) * 100;
}

function computeBusiestWeek(data) {
  const sorted = sortByDate(data).filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
  if (sorted.length < 3) return null;
  let best = null;
  for (let start = 0; start < sorted.length; start += 1) {
    const startDate = new Date(`${sorted[start].date}T00:00:00`);
    const endLimit = new Date(startDate);
    endLimit.setDate(endLimit.getDate() + 6);
    let cost = 0;
    let end = start;
    while (end < sorted.length && new Date(`${sorted[end].date}T00:00:00`) <= endLimit) {
      cost += sorted[end].totalCost;
      end += 1;
    }
    if (!best || cost > best.cost) {
      best = { start: sorted[start].date, end: sorted[end - 1].date, cost };
    }
  }
  return best;
}

function computeMetrics(data) {
  if (data.length === 0) {
    return {
      totalCost: 0,
      totalTokens: 0,
      activeDays: 0,
      totalRequests: 0,
      hasRequestData: false,
      avgDailyCost: 0,
      avgRequestsPerDay: 0,
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      cacheHitRate: 0,
      costPerMillion: 0,
      topModel: null,
      topModelShare: 0,
      topProvider: null,
      topDay: null,
      cheapestDay: null,
      busiestWeek: null,
      weekendCostShare: null,
      weekOverWeekChange: null,
      requestVolatility: 0,
      providerCount: 0,
    };
  }

  const modelCosts = new Map();
  const providerCosts = new Map();
  let totalCost = 0;
  let totalTokens = 0;
  let totalRequests = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheCreate = 0;
  let totalThinking = 0;
  let activeDays = 0;
  let hasRequestData = false;
  let weekendCost = 0;
  let weekendEligible = 0;
  let topDay = { date: data[0].date, cost: data[0].totalCost };
  let cheapestDay = { date: data[0].date, cost: data[0].totalCost };

  for (const day of data) {
    totalCost += day.totalCost;
    totalTokens += day.totalTokens;
    totalRequests += day.requestCount;
    totalInput += day.inputTokens;
    totalOutput += day.outputTokens;
    totalCacheRead += day.cacheReadTokens;
    totalCacheCreate += day.cacheCreationTokens;
    totalThinking += day.thinkingTokens;
    activeDays += day._aggregatedDays || 1;
    if (day.requestCount > 0 || day.modelBreakdowns.some((entry) => entry.requestCount > 0)) hasRequestData = true;
    if (day.totalCost > topDay.cost) topDay = { date: day.date, cost: day.totalCost };
    if (day.totalCost < cheapestDay.cost) cheapestDay = { date: day.date, cost: day.totalCost };

    if (/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      const weekday = new Date(`${day.date}T00:00:00`).getDay();
      if (weekday === 0 || weekday === 6) weekendCost += day.totalCost;
      weekendEligible += day.totalCost;
    }

    for (const breakdown of day.modelBreakdowns) {
      const model = normalizeModelName(breakdown.modelName);
      const provider = getModelProvider(breakdown.modelName);
      modelCosts.set(model, (modelCosts.get(model) || 0) + breakdown.cost);
      providerCosts.set(provider, (providerCosts.get(provider) || 0) + breakdown.cost);
    }
  }

  let topModel = null;
  for (const [name, cost] of modelCosts) {
    if (!topModel || cost > topModel.cost) topModel = { name, cost };
  }

  let topProvider = null;
  for (const [name, cost] of providerCosts) {
    if (!topProvider || cost > topProvider.cost) {
      topProvider = { name, cost, share: totalCost > 0 ? (cost / totalCost) * 100 : 0 };
    }
  }

  const cacheBase = totalCacheRead + totalCacheCreate + totalInput + totalOutput + totalThinking;

  return {
    totalCost,
    totalTokens,
    activeDays,
    totalRequests,
    totalInput,
    totalOutput,
    totalCacheRead,
    totalCacheCreate,
    totalThinking,
    hasRequestData,
    avgDailyCost: activeDays > 0 ? totalCost / activeDays : 0,
    avgRequestsPerDay: hasRequestData && activeDays > 0 ? totalRequests / activeDays : 0,
    avgTokensPerRequest: hasRequestData && totalRequests > 0 ? totalTokens / totalRequests : 0,
    avgCostPerRequest: hasRequestData && totalRequests > 0 ? totalCost / totalRequests : 0,
    cacheHitRate: cacheBase > 0 ? (totalCacheRead / cacheBase) * 100 : 0,
    costPerMillion: totalTokens > 0 ? totalCost / (totalTokens / 1000000) : 0,
    topModel,
    topModelShare: topModel && totalCost > 0 ? (topModel.cost / totalCost) * 100 : 0,
    topProvider,
    topDay,
    cheapestDay,
    busiestWeek: computeBusiestWeek(data),
    weekendCostShare: weekendEligible > 0 ? (weekendCost / weekendEligible) * 100 : null,
    weekOverWeekChange: computeWeekOverWeekChange(data),
    requestVolatility: stdDev(data.map((item) => item.requestCount)),
    providerCount: providerCosts.size,
  };
}

function computeModelRows(data) {
  const rows = new Map();
  for (const day of data) {
    const entryDays = day._aggregatedDays || 1;
    for (const breakdown of day.modelBreakdowns) {
      const model = normalizeModelName(breakdown.modelName);
      const current = rows.get(model) || {
        name: model,
        provider: getModelProvider(breakdown.modelName),
        cost: 0,
        tokens: 0,
        requests: 0,
        days: 0,
        _dates: new Set(),
      };
      current.cost += breakdown.cost;
      current.tokens += breakdown.inputTokens + breakdown.outputTokens + breakdown.cacheCreationTokens + breakdown.cacheReadTokens + breakdown.thinkingTokens;
      current.requests += breakdown.requestCount;
      if (!current._dates.has(day.date)) {
        current._dates.add(day.date);
        current.days += entryDays;
      }
      rows.set(model, current);
    }
  }

  return Array.from(rows.values())
    .map((entry) => ({
      name: entry.name,
      provider: entry.provider,
      cost: entry.cost,
      tokens: entry.tokens,
      requests: entry.requests,
      days: entry.days,
      color: getModelColor(entry.name),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function computeProviderRows(data) {
  const rows = new Map();
  for (const day of data) {
    const entryDays = day._aggregatedDays || 1;
    for (const breakdown of day.modelBreakdowns) {
      const provider = getModelProvider(breakdown.modelName);
      const current = rows.get(provider) || {
        name: provider,
        cost: 0,
        tokens: 0,
        requests: 0,
        days: 0,
      };
      current.cost += breakdown.cost;
      current.tokens += breakdown.inputTokens + breakdown.outputTokens + breakdown.cacheCreationTokens + breakdown.cacheReadTokens + breakdown.thinkingTokens;
      current.requests += breakdown.requestCount;
      current.days += entryDays;
      rows.set(provider, current);
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.cost - a.cost);
}

function getDateRange(data) {
  if (!data.length) return null;
  let start = data[0].date;
  let end = data[0].date;
  for (let index = 1; index < data.length; index += 1) {
    if (data[index].date < start) start = data[index].date;
    if (data[index].date > end) end = data[index].date;
  }
  return { start, end };
}

function formatDate(dateStr, mode = 'short') {
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return mode === 'short'
      ? date.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' })
      : date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
  }
  const date = new Date(`${dateStr}T00:00:00`);
  if (mode === 'long') {
    return date.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
}

function formatDateAxis(dateStr) {
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' });
  }
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
}

function formatFilterValue(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}$/.test(value)) return formatDate(value, 'long');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, 'long');
  return value;
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0.00';
  if (Math.abs(value) >= 100) {
    return `$${Math.round(value).toLocaleString('de-CH')}`;
  }
  return `$${value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInteger(value) {
  return Math.round(value || 0).toLocaleString('de-CH');
}

function formatCompact(value) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return formatInteger(value);
}

function formatPercent(value) {
  return `${(value || 0).toFixed(1)}%`;
}

function periodUnit(viewMode) {
  if (viewMode === 'monthly') return 'Monat';
  if (viewMode === 'yearly') return 'Jahr';
  return 'Tag';
}

function applyReportFilters(allDailyData, filters) {
  const sorted = sortByDate(allDailyData);
  const preProvider = filterByMonth(filterByDateRange(sorted, filters.startDate, filters.endDate), filters.selectedMonth);
  const preModel = filterByProviders(preProvider, filters.selectedProviders || []);
  const filteredDaily = filterByModels(preModel, filters.selectedModels || []);
  const filtered = aggregateToDailyFormat(filteredDaily, filters.viewMode || 'daily');
  return {
    filteredDaily,
    filtered,
    dateRange: getDateRange(filteredDaily),
  };
}

function buildReportData(allDailyData, options = {}) {
  const filters = {
    viewMode: options.viewMode || 'daily',
    selectedMonth: options.selectedMonth || null,
    selectedProviders: options.selectedProviders || [],
    selectedModels: options.selectedModels || [],
    startDate: options.startDate,
    endDate: options.endDate,
  };

  const { filteredDaily, filtered, dateRange } = applyReportFilters(allDailyData, filters);
  const metrics = computeMetrics(filtered);
  const modelRows = computeModelRows(filtered).slice(0, 12);
  const providerRows = computeProviderRows(filtered).slice(0, 8);
  const recentRows = sortByDate(filtered).slice(-12).reverse().map((entry) => ({
    period: entry.date,
    label: formatDate(entry.date, 'long'),
    cost: entry.totalCost,
    costLabel: formatCurrency(entry.totalCost),
    tokens: entry.totalTokens,
    tokensLabel: formatCompact(entry.totalTokens),
    requests: entry.requestCount,
    requestsLabel: formatInteger(entry.requestCount),
  }));

  const summaryCards = [
    { label: 'Kosten gesamt', value: formatCurrency(metrics.totalCost), note: metrics.topProvider ? `${metrics.topProvider.name} ${formatPercent(metrics.topProvider.share)}` : 'n/a', tone: 'accent' },
    { label: 'Tokens gesamt', value: formatCompact(metrics.totalTokens), note: `CPM ${formatCurrency(metrics.costPerMillion)}`, tone: 'accent' },
    { label: 'Requests gesamt', value: formatInteger(metrics.totalRequests), note: metrics.hasRequestData ? `${formatPercent(metrics.cacheHitRate)} Cache-Hit-Rate` : 'Keine Request-Daten', tone: 'good' },
    { label: `Ø Kosten / ${periodUnit(filters.viewMode)}`, value: formatCurrency(metrics.avgDailyCost), note: `${reportDataLabel(filters.viewMode)}-Aggregation`, tone: 'accent' },
    { label: 'Top-Modell', value: metrics.topModel ? metrics.topModel.name : 'n/a', note: metrics.topModel ? formatPercent(metrics.topModelShare) : 'n/a', tone: 'warn' },
    { label: 'Stärkster Zeitraum', value: metrics.topDay ? metrics.topDay.date : 'n/a', note: metrics.topDay ? formatCurrency(metrics.topDay.cost) : 'n/a', tone: 'warn' },
  ];

  return {
    meta: {
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      generatedAtLabel: new Date().toLocaleString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportTitle: options.reportTitle || 'TTDash Report',
      filterSummary: {
        viewMode: filters.viewMode,
        selectedMonth: filters.selectedMonth,
        selectedMonthLabel: formatFilterValue(filters.selectedMonth),
        selectedProviders: filters.selectedProviders,
        selectedModels: filters.selectedModels,
        startDate: filters.startDate || null,
        startDateLabel: formatFilterValue(filters.startDate || null),
        endDate: filters.endDate || null,
        endDateLabel: formatFilterValue(filters.endDate || null),
      },
      dateRange,
      periods: filtered.length,
      days: filteredDaily.length,
      periodUnit: periodUnit(filters.viewMode),
    },
    metrics,
    summaryCards,
    charts: {
      costTrend: toCostChartData(filtered),
      tokenTrend: toTokenChartData(filtered),
      weekday: toWeekdayData(filtered),
    },
    topModels: modelRows.map((entry) => ({
      ...entry,
      costLabel: formatCurrency(entry.cost),
      requestsLabel: formatInteger(entry.requests),
      tokensLabel: formatCompact(entry.tokens),
    })),
    providers: providerRows.map((entry) => ({
      ...entry,
      costLabel: formatCurrency(entry.cost),
      requestsLabel: formatInteger(entry.requests),
      tokensLabel: formatCompact(entry.tokens),
    })),
    recentPeriods: recentRows,
    labels: {
      dateRangeText: dateRange ? `${formatDate(dateRange.start, 'long')} bis ${formatDate(dateRange.end, 'long')}` : 'Keine Daten',
      topModel: metrics.topModel ? `${metrics.topModel.name} (${metrics.topModelShare.toFixed(1)}%)` : 'n/a',
      topProvider: metrics.topProvider ? `${metrics.topProvider.name} (${metrics.topProvider.share.toFixed(1)}%)` : 'n/a',
      topDay: metrics.topDay ? `${formatDate(metrics.topDay.date, 'long')} (${metrics.topDay.cost.toFixed(2)} USD)` : 'n/a',
    },
    formatting: {
      axisDates: filtered.map((entry) => ({ date: entry.date, label: formatDateAxis(entry.date) })),
    },
  };
}

function reportDataLabel(viewMode) {
  if (viewMode === 'monthly') return 'Monats';
  if (viewMode === 'yearly') return 'Jahres';
  return 'Tages';
}

module.exports = {
  applyReportFilters,
  buildReportData,
  formatDate,
  formatDateAxis,
  getModelColor,
};
