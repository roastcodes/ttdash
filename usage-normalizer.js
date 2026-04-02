function toNumber(value) {
  return Number.isFinite(value) ? value : Number(value) || 0
}

function toStringValue(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeLegacyModelBreakdown(entry) {
  return {
    modelName: toStringValue(entry?.modelName),
    inputTokens: toNumber(entry?.inputTokens),
    outputTokens: toNumber(entry?.outputTokens),
    cacheCreationTokens: toNumber(entry?.cacheCreationTokens),
    cacheReadTokens: toNumber(entry?.cacheReadTokens),
    thinkingTokens: toNumber(entry?.thinkingTokens),
    cost: toNumber(entry?.cost),
    requestCount: toNumber(entry?.requestCount),
  };
}

function withDailyTotals(day) {
  const totalTokens = toNumber(day.totalTokens) || (
    toNumber(day.inputTokens) +
    toNumber(day.outputTokens) +
    toNumber(day.cacheCreationTokens) +
    toNumber(day.cacheReadTokens) +
    toNumber(day.thinkingTokens)
  );

  return {
    date: toStringValue(day.date),
    inputTokens: toNumber(day.inputTokens),
    outputTokens: toNumber(day.outputTokens),
    cacheCreationTokens: toNumber(day.cacheCreationTokens),
    cacheReadTokens: toNumber(day.cacheReadTokens),
    thinkingTokens: toNumber(day.thinkingTokens),
    totalTokens,
    totalCost: toNumber(day.totalCost),
    requestCount: toNumber(day.requestCount),
    modelsUsed: Array.isArray(day.modelsUsed) ? day.modelsUsed.filter((value) => typeof value === 'string') : [],
    modelBreakdowns: Array.isArray(day.modelBreakdowns) ? day.modelBreakdowns.map(normalizeLegacyModelBreakdown) : [],
  };
}

function normalizeLegacyDay(entry) {
  const modelBreakdowns = Array.isArray(entry?.modelBreakdowns)
    ? entry.modelBreakdowns.map(normalizeLegacyModelBreakdown)
    : [];

  return withDailyTotals({
    date: entry?.date,
    inputTokens: entry?.inputTokens,
    outputTokens: entry?.outputTokens,
    cacheCreationTokens: entry?.cacheCreationTokens,
    cacheReadTokens: entry?.cacheReadTokens,
    thinkingTokens: entry?.thinkingTokens,
    totalTokens: entry?.totalTokens,
    totalCost: entry?.totalCost,
    requestCount: entry?.requestCount,
    modelsUsed: Array.isArray(entry?.modelsUsed)
      ? entry.modelsUsed
      : modelBreakdowns.map((item) => item.modelName),
    modelBreakdowns,
  });
}

function normalizeToktrackDay(entry) {
  const models = entry?.models && typeof entry.models === 'object' && !Array.isArray(entry.models)
    ? entry.models
    : {};

  const modelBreakdowns = Object.entries(models).map(([modelName, modelData]) => ({
    modelName,
    inputTokens: toNumber(modelData?.input_tokens),
    outputTokens: toNumber(modelData?.output_tokens),
    cacheCreationTokens: toNumber(modelData?.cache_creation_tokens),
    cacheReadTokens: toNumber(modelData?.cache_read_tokens),
    thinkingTokens: toNumber(modelData?.thinking_tokens),
    cost: toNumber(modelData?.cost_usd),
    requestCount: toNumber(modelData?.count),
  }));

  const requestCount = modelBreakdowns.reduce((sum, item) => sum + item.requestCount, 0);

  return withDailyTotals({
    date: entry?.date,
    inputTokens: entry?.total_input_tokens,
    outputTokens: entry?.total_output_tokens,
    cacheCreationTokens: entry?.total_cache_creation_tokens,
    cacheReadTokens: entry?.total_cache_read_tokens,
    thinkingTokens: entry?.total_thinking_tokens,
    totalCost: entry?.total_cost_usd,
    requestCount,
    modelsUsed: modelBreakdowns.map((item) => item.modelName),
    modelBreakdowns,
  });
}

function computeTotals(daily) {
  return daily.reduce((totals, day) => ({
    inputTokens: totals.inputTokens + day.inputTokens,
    outputTokens: totals.outputTokens + day.outputTokens,
    cacheCreationTokens: totals.cacheCreationTokens + day.cacheCreationTokens,
    cacheReadTokens: totals.cacheReadTokens + day.cacheReadTokens,
    thinkingTokens: totals.thinkingTokens + day.thinkingTokens,
    totalCost: totals.totalCost + day.totalCost,
    totalTokens: totals.totalTokens + day.totalTokens,
    requestCount: totals.requestCount + day.requestCount,
  }), {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    thinkingTokens: 0,
    totalCost: 0,
    totalTokens: 0,
    requestCount: 0,
  });
}

function normalizeIncomingData(payload) {
  let daily;

  if (Array.isArray(payload)) {
    daily = payload.map(normalizeToktrackDay);
  } else if (payload && typeof payload === 'object' && Array.isArray(payload.daily)) {
    const looksLikeToktrack = payload.daily.some((item) => item && typeof item === 'object' && 'total_input_tokens' in item);
    daily = looksLikeToktrack
      ? payload.daily.map(normalizeToktrackDay)
      : payload.daily.map(normalizeLegacyDay);
  } else {
    throw new Error('Die JSON-Datei muss ein gültiges tägliches Nutzungsformat enthalten.');
  }

  const filtered = daily
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    throw new Error('Keine Nutzungsdaten gefunden.');
  }

  return {
    daily: filtered,
    totals: computeTotals(filtered),
  };
}

module.exports = {
  normalizeIncomingData,
};
