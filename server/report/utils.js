const { version: APP_VERSION } = require('../../package.json');
const { getLanguage, getLocale, translate } = require('./i18n');
const { truncateTopModelChartLabel } = require('./chart-labels');
const {
  aggregateToDailyFormat,
  computeMetrics,
  computeMovingAverage,
  filterByDateRange,
  filterByModels,
  filterByMonth,
  filterByProviders,
  getModelProvider,
  normalizeModelName,
  sortByDate,
} = require('../../shared/dashboard-domain');
const { createModelColorPalette, getModelColorRgb } = require('../../shared/model-colors.js');

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getModelColor(name, palette = null) {
  return palette
    ? palette.getColorRgb(name, { theme: 'light' })
    : getModelColorRgb(name, { theme: 'light' });
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
    const average =
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { day: label, cost: average };
  });
}

function computeModelRows(data, palette) {
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
      current.tokens +=
        breakdown.inputTokens +
        breakdown.outputTokens +
        breakdown.cacheCreationTokens +
        breakdown.cacheReadTokens +
        breakdown.thinkingTokens;
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
      color: getModelColor(entry.name, palette),
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
        _dates: new Set(),
      };
      current.cost += breakdown.cost;
      current.tokens +=
        breakdown.inputTokens +
        breakdown.outputTokens +
        breakdown.cacheCreationTokens +
        breakdown.cacheReadTokens +
        breakdown.thinkingTokens;
      current.requests += breakdown.requestCount;
      if (!current._dates.has(day.date)) {
        current._dates.add(day.date);
        current.days += entryDays;
      }
      rows.set(provider, current);
    }
  }
  return Array.from(rows.values())
    .map((entry) => ({
      name: entry.name,
      cost: entry.cost,
      tokens: entry.tokens,
      requests: entry.requests,
      days: entry.days,
    }))
    .sort((a, b) => b.cost - a.cost);
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

function formatDate(dateStr, mode = 'short', language = 'de') {
  const locale = getLocale(language);
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return mode === 'short'
      ? date.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
      : date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  const date = new Date(`${dateStr}T00:00:00`);
  if (mode === 'long') {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

function formatDateAxis(dateStr, language = 'de') {
  const locale = getLocale(language);
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
  }
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatFilterValue(value, language = 'de') {
  if (!value) return null;
  if (/^\d{4}-\d{2}$/.test(value)) return formatDate(value, 'long', language);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, 'long', language);
  return value;
}

function formatCurrency(value, language = 'de') {
  const locale = getLocale(language);
  if (!Number.isFinite(value)) return '$0.00';
  if (Math.abs(value) >= 100) {
    return `$${Math.round(value).toLocaleString(locale)}`;
  }
  return `$${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInteger(value, language = 'de') {
  return Math.round(value || 0).toLocaleString(getLocale(language));
}

function formatPercent(value, language = 'de') {
  return `${(value || 0).toLocaleString(getLocale(language), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function findPeakEntry(data, getValue) {
  let best = null;
  for (const entry of data) {
    if (!best || getValue(entry) > getValue(best)) {
      best = entry;
    }
  }
  return best;
}

function formatCompactNumber(value, language = 'de') {
  if (!Number.isFinite(value)) return '0';

  const abs = Math.abs(value);
  const locale = getLocale(language);

  if (abs >= 1e9) {
    const suffix = language === 'en' ? 'B' : ' Mrd.';
    return `${(value / 1e9).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${suffix}`;
  }

  if (abs >= 1e6) {
    const suffix = language === 'en' ? 'M' : ' Mio.';
    return `${(value / 1e6).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${suffix}`;
  }

  if (abs >= 1e3) {
    const suffix = language === 'en' ? 'k' : ' Tsd.';
    return `${(value / 1e3).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${suffix}`;
  }

  return formatInteger(value, language);
}

function formatCompact(value, language = 'de') {
  return formatCompactNumber(value, language);
}

function formatCompactAxis(value, language = 'de') {
  return formatCompactNumber(value, language);
}

function summarizeSelection(
  values,
  language,
  { emptyKey, maxVisible = 3, normalize = (value) => value } = {},
) {
  const normalized = (values || []).map(normalize).filter(Boolean);

  if (normalized.length === 0) {
    return translate(language, emptyKey);
  }

  const visible = normalized.slice(0, maxVisible);
  const hidden = normalized.length - visible.length;
  const suffix =
    hidden > 0 ? ` ${translate(language, 'report.filters.andMore', { count: hidden })}` : '';

  return `${visible.join(', ')}${suffix}`;
}

function buildInsights(metrics, { filteredDaily, filtered, language }) {
  const insights = [];

  if (filteredDaily.length > 0 && filteredDaily.length < 7) {
    insights.push({
      tone: 'warn',
      title: translate(language, 'report.insights.coverageTitle'),
      body: translate(language, 'report.insights.coverageBody', {
        days: formatInteger(filteredDaily.length, language),
        periods: formatInteger(filtered.length, language),
      }),
    });
  }

  if (metrics.topProvider) {
    insights.push({
      tone: metrics.topProvider.share >= 60 ? 'warn' : 'accent',
      title: translate(language, 'report.insights.providerTitle'),
      body: translate(language, 'report.insights.providerBody', {
        provider: metrics.topProvider.name,
        share: formatPercent(metrics.topProvider.share, language),
      }),
    });
  }

  if (metrics.cacheHitRate > 0) {
    insights.push({
      tone: metrics.cacheHitRate >= 20 ? 'good' : 'accent',
      title: translate(language, 'report.insights.cacheTitle'),
      body: translate(language, 'report.insights.cacheBody', {
        share: formatPercent(metrics.cacheHitRate, language),
      }),
    });
  }

  if (metrics.busiestWeek) {
    insights.push({
      tone: 'accent',
      title: translate(language, 'report.insights.peakWindowTitle'),
      body: translate(language, 'report.insights.peakWindowBody', {
        start: formatDate(metrics.busiestWeek.start, 'long', language),
        end: formatDate(metrics.busiestWeek.end, 'long', language),
        cost: formatCurrency(metrics.busiestWeek.cost, language),
      }),
    });
  }

  return insights.slice(0, 4);
}

function periodUnit(viewMode, language = 'de') {
  if (viewMode === 'monthly') return translate(language, 'periods.month');
  if (viewMode === 'yearly') return translate(language, 'periods.year');
  return translate(language, 'periods.day');
}

function applyReportFilters(allDailyData, filters) {
  const sorted = sortByDate(allDailyData);
  const preProvider = filterByMonth(
    filterByDateRange(sorted, filters.startDate, filters.endDate),
    filters.selectedMonth,
  );
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
  const language = getLanguage(options.language);
  const filters = {
    viewMode: options.viewMode || 'daily',
    selectedMonth: options.selectedMonth || null,
    selectedProviders: options.selectedProviders || [],
    selectedModels: options.selectedModels || [],
    startDate: options.startDate,
    endDate: options.endDate,
  };

  const { filteredDaily, filtered, dateRange } = applyReportFilters(allDailyData, filters);
  const reportPalette = createModelColorPalette(
    allDailyData.flatMap((day) =>
      day.modelBreakdowns.map((entry) => normalizeModelName(entry.modelName)),
    ),
  );
  const metrics = computeMetrics(filtered);
  const modelRows = computeModelRows(filtered, reportPalette).slice(0, 12);
  const providerRows = computeProviderRows(filtered).slice(0, 8);
  const periodLabel = periodUnit(filters.viewMode, language);
  const notAvailable = translate(language, 'report.common.notAvailable');
  const selectedProvidersLabel = summarizeSelection(filters.selectedProviders, language, {
    emptyKey: 'report.filters.all',
  });
  const selectedModelsLabel = summarizeSelection(filters.selectedModels, language, {
    emptyKey: 'report.filters.all',
    normalize: normalizeModelName,
  });
  const monthLabel =
    formatFilterValue(filters.selectedMonth, language) || translate(language, 'report.filters.all');
  const startDateLabel =
    formatFilterValue(filters.startDate || null, language) ||
    translate(language, 'report.filters.noFilter');
  const endDateLabel =
    formatFilterValue(filters.endDate || null, language) ||
    translate(language, 'report.filters.noFilter');
  const peakPeriodLabel = metrics.topDay
    ? formatDate(metrics.topDay.date, 'long', language)
    : notAvailable;
  const topModelValue = metrics.topModel ? metrics.topModel.name : notAvailable;
  const topProviderValue = metrics.topProvider ? metrics.topProvider.name : notAvailable;
  const insights = buildInsights(metrics, { filteredDaily, filtered, language });
  const avgPeriodCost = filtered.length > 0 ? metrics.totalCost / filtered.length : 0;
  const latestPeriod = filtered[filtered.length - 1] || null;
  const peakCostPeriod = findPeakEntry(filtered, (entry) => entry.totalCost);
  const peakTokenPeriod = findPeakEntry(filtered, (entry) => entry.totalTokens);
  const recentRows = sortByDate(filtered)
    .slice(-12)
    .reverse()
    .map((entry) => ({
      period: entry.date,
      label: formatDate(entry.date, 'long', language),
      cost: entry.totalCost,
      costLabel: formatCurrency(entry.totalCost, language),
      tokens: entry.totalTokens,
      tokensLabel: formatCompact(entry.totalTokens, language),
      requests: entry.requestCount,
      requestsLabel: formatInteger(entry.requestCount, language),
    }));

  const summaryCards = [
    {
      label: translate(language, 'common.costs'),
      value: formatCurrency(metrics.totalCost, language),
      note: metrics.topProvider
        ? `${metrics.topProvider.name} ${formatPercent(metrics.topProvider.share, language)}`
        : notAvailable,
      tone: 'accent',
    },
    {
      label: translate(language, 'common.tokens'),
      value: formatCompact(metrics.totalTokens, language),
      note: `CPM ${formatCurrency(metrics.costPerMillion, language)}`,
      tone: 'accent',
    },
    {
      label: translate(language, 'common.requests'),
      value: formatInteger(metrics.totalRequests, language),
      note: metrics.hasRequestData
        ? `${formatPercent(metrics.cacheHitRate, language)} Cache`
        : notAvailable,
      tone: 'good',
    },
    {
      label: `Ø ${translate(language, 'common.cost')} / ${periodLabel}`,
      value: formatCurrency(avgPeriodCost, language),
      note: `${reportDataLabel(filters.viewMode, language)}`,
      tone: 'accent',
    },
    {
      label: translate(language, 'common.model'),
      value: topModelValue,
      note: metrics.topModel ? formatPercent(metrics.topModelShare, language) : notAvailable,
      tone: 'warn',
    },
    {
      label: translate(language, 'report.summary.peakPeriod'),
      value: peakPeriodLabel,
      note: metrics.topDay ? formatCurrency(metrics.topDay.cost, language) : notAvailable,
      tone: 'warn',
    },
  ];

  const topChartModels = modelRows.slice(0, 8);
  const truncatedTopModelNames = topChartModels
    .filter((entry) => truncateTopModelChartLabel(entry.name) !== entry.name)
    .map((entry) => entry.name);
  const topModelSummary = metrics.topModel
    ? translate(language, 'report.charts.topModelsSummary', {
        model: metrics.topModel.name,
        cost: formatCurrency(metrics.topModel.cost, language),
        share: formatPercent(metrics.topModelShare, language),
      })
    : translate(language, 'report.charts.noDataSummary');
  const costTrendSummary =
    latestPeriod && peakCostPeriod
      ? translate(language, 'report.charts.costTrendSummary', {
          latest: formatCurrency(latestPeriod.totalCost, language),
          peak: formatCurrency(peakCostPeriod.totalCost, language),
          date: formatDate(peakCostPeriod.date, 'long', language),
        })
      : translate(language, 'report.charts.noDataSummary');
  const tokenTrendSummary =
    peakTokenPeriod && metrics.totalTokens > 0
      ? translate(language, 'report.charts.tokenTrendSummary', {
          total: formatCompact(metrics.totalTokens, language),
          peak: formatCompact(peakTokenPeriod.totalTokens, language),
          date: formatDate(peakTokenPeriod.date, 'long', language),
        })
      : translate(language, 'report.charts.noDataSummary');

  const interpretationSummary = translate(language, 'report.interpretation.summary', {
    days: formatInteger(filteredDaily.length, language),
    periods: formatInteger(filtered.length, language),
    peak: peakPeriodLabel,
    topModel: topModelValue,
    topProvider: topProviderValue,
  });

  const interpretationFooter = translate(language, 'report.interpretation.footer', {
    version: APP_VERSION,
  });

  return {
    meta: {
      language,
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      generatedAtLabel: new Date().toLocaleString(getLocale(language), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportTitle: options.reportTitle || translate(language, 'report.title'),
      filterSummary: {
        viewModeKey: filters.viewMode,
        viewMode: translate(language, `viewModes.${filters.viewMode}`),
        selectedMonth: filters.selectedMonth,
        selectedMonthLabel: monthLabel,
        selectedProviders: filters.selectedProviders,
        selectedProvidersLabel,
        selectedModels: filters.selectedModels,
        selectedModelsLabel,
        startDate: filters.startDate || null,
        startDateLabel,
        endDate: filters.endDate || null,
        endDateLabel,
      },
      dateRange,
      periods: filtered.length,
      days: filteredDaily.length,
      periodUnit: periodLabel,
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
      costLabel: formatCurrency(entry.cost, language),
      requestsLabel: formatInteger(entry.requests, language),
      tokensLabel: formatCompact(entry.tokens, language),
    })),
    providers: providerRows.map((entry) => ({
      ...entry,
      costLabel: formatCurrency(entry.cost, language),
      requestsLabel: formatInteger(entry.requests, language),
      tokensLabel: formatCompact(entry.tokens, language),
    })),
    recentPeriods: recentRows,
    chartDescriptions: {
      costTrend: {
        alt: translate(language, 'report.charts.costTrendAlt'),
        summary: costTrendSummary,
      },
      topModels: {
        alt: translate(language, 'report.charts.topModelsAlt'),
        summary: topModelSummary,
        fullNamesNote:
          truncatedTopModelNames.length > 0
            ? translate(language, 'report.charts.topModelsFullNames', {
                names: truncatedTopModelNames.join(', '),
              })
            : null,
      },
      tokenTrend: {
        alt: translate(language, 'report.charts.tokenTrendAlt'),
        summary: tokenTrendSummary,
      },
    },
    labels: {
      dateRangeText: dateRange
        ? `${formatDate(dateRange.start, 'long', language)} - ${formatDate(dateRange.end, 'long', language)}`
        : translate(language, 'common.noData'),
      topModel: metrics.topModel
        ? `${metrics.topModel.name} (${formatPercent(metrics.topModelShare, language)})`
        : notAvailable,
      topProvider: metrics.topProvider
        ? `${metrics.topProvider.name} (${formatPercent(metrics.topProvider.share, language)})`
        : notAvailable,
      topDay: metrics.topDay
        ? `${formatDate(metrics.topDay.date, 'long', language)} (${formatCurrency(metrics.topDay.cost, language)})`
        : notAvailable,
    },
    interpretation: {
      summary: interpretationSummary,
      footer: interpretationFooter,
    },
    insights: {
      items: insights,
    },
    text: {
      headerEyebrow: translate(language, 'report.header.eyebrow'),
      sections: {
        overview: translate(language, 'report.sections.overview'),
        insights: translate(language, 'report.sections.insights'),
        filters: translate(language, 'report.sections.filters'),
        modelsProviders: translate(language, 'report.sections.modelsProviders'),
        recentPeriods: translate(language, 'report.sections.recentPeriods'),
        interpretation: translate(language, 'report.sections.interpretation'),
      },
      fields: {
        dateRange: translate(language, 'report.fields.dateRange'),
        view: translate(language, 'report.fields.view'),
        generated: translate(language, 'report.fields.generated'),
        month: translate(language, 'report.fields.month'),
        selectedProviders: translate(language, 'report.fields.selectedProviders'),
        selectedModels: translate(language, 'report.fields.selectedModels'),
        startDate: translate(language, 'report.fields.startDate'),
        endDate: translate(language, 'report.fields.endDate'),
      },
      tables: {
        topModels: translate(language, 'report.tables.topModels'),
        providers: translate(language, 'report.tables.providers'),
        columns: {
          model: translate(language, 'report.tables.columns.model'),
          provider: translate(language, 'report.tables.columns.provider'),
          cost: translate(language, 'report.tables.columns.cost'),
          tokens: translate(language, 'report.tables.columns.tokens'),
          requests: translate(language, 'report.tables.columns.requests'),
          period: translate(language, 'report.tables.columns.period'),
        },
      },
      charts: {
        costTrend: translate(language, 'report.charts.costTrend'),
        topModels: translate(language, 'report.charts.topModels'),
        tokenTrend: translate(language, 'report.charts.tokenTrend'),
      },
    },
    formatting: {
      axisDates: filtered.map((entry) => ({
        date: entry.date,
        label: formatDateAxis(entry.date, language),
      })),
    },
  };
}

function reportDataLabel(viewMode, language = 'de') {
  if (language === 'en') {
    if (viewMode === 'monthly') return 'monthly aggregation';
    if (viewMode === 'yearly') return 'yearly aggregation';
    return 'daily aggregation';
  }
  if (viewMode === 'monthly') return 'Monats-Aggregation';
  if (viewMode === 'yearly') return 'Jahres-Aggregation';
  return 'Tages-Aggregation';
}

module.exports = {
  applyReportFilters,
  buildReportData,
  formatCompact,
  formatCompactAxis,
  formatCurrency,
  formatDate,
  formatDateAxis,
  getModelColor,
  __test__: {
    getModelProvider,
    normalizeModelName,
  },
};
