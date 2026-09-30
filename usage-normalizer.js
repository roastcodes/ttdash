const {
  UNASSIGNED_MODEL,
  calendarDay,
  combineRequestCountStatus,
} = require('./shared/usage-quality');

const TOKEN_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheCreationTokens',
  'cacheReadTokens',
  'thinkingTokens',
];
const TOKTRACK_FIELDS = {
  inputTokens: 'input_tokens',
  outputTokens: 'output_tokens',
  cacheCreationTokens: 'cache_creation_tokens',
  cacheReadTokens: 'cache_read_tokens',
  thinkingTokens: 'thinking_tokens',
  cost: 'cost_usd',
  requestCount: 'count',
};
const COST_TOLERANCE = 1e-6;
const MAX_ISSUES = 50;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function addIssue(issues, date, field, code) {
  if (issues.length < MAX_ISSUES) {
    issues.push({ date: String(date).slice(0, 32), field: String(field).slice(0, 160), code });
  }
}

function numeric(value, date, field, issues, integer = true) {
  if (isMissing(value)) return 0;
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isSafeInteger(number))) {
    addIssue(issues, date, field, 'invalid_number');
    return 0;
  }
  return number;
}

function counterStatus(entry, key, persisted = false) {
  if (['known', 'partial', 'unknown'].includes(entry.requestCountStatus)) {
    return entry.requestCountStatus;
  }
  if (persisted && key === 'requestCount' && !(Number(entry[key]) > 0)) return 'unknown';
  return isMissing(entry[key]) ? 'unknown' : 'known';
}

function normalizeBreakdown(entry, modelName, toktrack, date, issues, persisted) {
  if (
    !isObject(entry) ||
    typeof modelName !== 'string' ||
    !modelName.trim() ||
    modelName.length > 512
  ) {
    addIssue(issues, date, 'modelBreakdowns', 'invalid_model');
    return null;
  }
  const result = { modelName: modelName.trim() };
  for (const field of [...TOKEN_FIELDS, 'cost', 'requestCount']) {
    const key = toktrack ? TOKTRACK_FIELDS[field] : field;
    result[field] = numeric(
      entry[key],
      date,
      `${result.modelName}.${field}`,
      issues,
      field !== 'cost',
    );
  }
  result.requestCountStatus = counterStatus(
    entry,
    toktrack ? 'count' : 'requestCount',
    persisted && !toktrack,
  );
  return result;
}

function sumBreakdowns(breakdowns, field) {
  return breakdowns.reduce((sum, breakdown) => sum + breakdown[field], 0);
}

function normalizeDay(entry, toktrack, issues, persisted) {
  if (!isObject(entry)) {
    addIssue(issues, '', 'daily', 'invalid_row');
    return null;
  }
  const date = typeof entry.date === 'string' ? entry.date : '';
  if (calendarDay(date) === null) {
    addIssue(issues, date, 'date', 'invalid_date');
    return null;
  }
  let modelBreakdowns;
  if (toktrack) {
    if (entry.models !== undefined && !isObject(entry.models)) {
      addIssue(issues, date, 'models', 'invalid_models');
    }
    modelBreakdowns = Object.entries(isObject(entry.models) ? entry.models : {}).map(
      ([modelName, data]) => normalizeBreakdown(data, modelName, true, date, issues, persisted),
    );
  } else {
    if (entry.modelBreakdowns !== undefined && !Array.isArray(entry.modelBreakdowns)) {
      addIssue(issues, date, 'modelBreakdowns', 'invalid_models');
    }
    modelBreakdowns = (Array.isArray(entry.modelBreakdowns) ? entry.modelBreakdowns : []).map(
      (data) => normalizeBreakdown(data, data?.modelName, false, date, issues, persisted),
    );
  }
  const byModel = new Map();
  for (const breakdown of modelBreakdowns.filter(Boolean)) {
    const key = `${breakdown.modelName}:${breakdown.requestCountStatus}`;
    const existing = byModel.get(key);
    if (!existing) {
      byModel.set(key, breakdown);
      continue;
    }
    for (const field of [...TOKEN_FIELDS, 'cost', 'requestCount'])
      existing[field] += breakdown[field];
    existing.requestCountStatus = combineRequestCountStatus(
      existing.requestCountStatus,
      breakdown.requestCountStatus,
    );
  }
  modelBreakdowns = [...byModel.values()];
  for (const breakdown of modelBreakdowns) {
    for (const field of [...TOKEN_FIELDS, 'requestCount']) {
      if (!Number.isSafeInteger(breakdown[field])) addIssue(issues, date, field, 'invalid_number');
    }
    if (!Number.isFinite(breakdown.cost)) addIssue(issues, date, 'cost', 'invalid_number');
  }
  const day = { date };
  const remainder = {
    modelName: UNASSIGNED_MODEL,
    cost: 0,
    requestCount: 0,
    requestCountStatus: 'unknown',
  };
  for (const field of [...TOKEN_FIELDS, 'totalCost', 'requestCount']) {
    const breakdownField = field === 'totalCost' ? 'cost' : field;
    const key = toktrack
      ? field === 'totalCost'
        ? 'total_cost_usd'
        : field === 'requestCount'
          ? null
          : `total_${TOKTRACK_FIELDS[field]}`
      : field;
    const sum = sumBreakdowns(modelBreakdowns, breakdownField);
    const value =
      key && !isMissing(entry[key])
        ? numeric(entry[key], date, field, issues, field !== 'totalCost')
        : sum;
    const tolerance = field === 'totalCost' ? COST_TOLERANCE : 0;
    if (value + tolerance < sum) addIssue(issues, date, field, 'breakdown_exceeds_total');
    day[field] = Math.max(value, sum);
    remainder[breakdownField] = Math.max(0, value - sum);
  }
  day.totalTokens = TOKEN_FIELDS.reduce((sum, field) => sum + day[field], 0);
  if (!Number.isSafeInteger(day.totalTokens))
    addIssue(issues, date, 'totalTokens', 'invalid_number');
  if (!isMissing(entry.totalTokens)) {
    const reported = numeric(entry.totalTokens, date, 'totalTokens', issues);
    if (reported !== day.totalTokens) addIssue(issues, date, 'totalTokens', 'inconsistent_total');
  }
  if (toktrack) {
    day.requestCountStatus = modelBreakdowns.length
      ? modelBreakdowns.reduce(
          (status, breakdown) => combineRequestCountStatus(status, breakdown.requestCountStatus),
          modelBreakdowns[0].requestCountStatus,
        )
      : 'unknown';
  } else {
    day.requestCountStatus = counterStatus(entry, 'requestCount', persisted);
    if (isMissing(entry.requestCount) && modelBreakdowns.length) {
      day.requestCountStatus = modelBreakdowns.reduce(
        (status, breakdown) => combineRequestCountStatus(status, breakdown.requestCountStatus),
        modelBreakdowns[0].requestCountStatus,
      );
    }
  }
  if (
    [...TOKEN_FIELDS, 'cost', 'requestCount'].some(
      (field) => remainder[field] > (field === 'cost' ? COST_TOLERANCE : 0),
    )
  ) {
    if (remainder.requestCount > 0 && day.requestCountStatus === 'known')
      remainder.requestCountStatus = 'known';
    modelBreakdowns.push(remainder);
  }
  day.modelsUsed = [...new Set(modelBreakdowns.map((breakdown) => breakdown.modelName))];
  day.modelBreakdowns = modelBreakdowns;
  return day;
}

function daySignature(day) {
  return JSON.stringify({
    ...day,
    modelsUsed: [...day.modelsUsed].sort(),
    modelBreakdowns: [...day.modelBreakdowns].sort((a, b) =>
      `${a.modelName}:${a.requestCountStatus}`.localeCompare(
        `${b.modelName}:${b.requestCountStatus}`,
      ),
    ),
  });
}

function computeTotals(daily) {
  const fields = [...TOKEN_FIELDS, 'totalCost', 'totalTokens', 'requestCount'];
  const totals = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const day of daily) {
    for (const field of fields) totals[field] += day[field];
  }
  return totals;
}

/** Validates new imports atomically, or reads legacy files with bounded quality diagnostics. */
function normalizeIncomingData(payload, { persisted = false } = {}) {
  const rows = Array.isArray(payload) ? payload : isObject(payload) ? payload.daily : null;
  if (!Array.isArray(rows)) {
    throw new Error('Die JSON-Datei muss ein gültiges tägliches Nutzungsformat enthalten.');
  }
  const issues = [];
  const historicalIssues =
    persisted && isObject(payload) && Array.isArray(payload.qualityIssues)
      ? payload.qualityIssues
          .filter(
            (issue) =>
              isObject(issue) &&
              ['date', 'field', 'code'].every((key) => typeof issue[key] === 'string'),
          )
          .slice(0, MAX_ISSUES)
          .map((issue) => ({
            date: issue.date.slice(0, 32),
            field: issue.field.slice(0, 160),
            code: issue.code.slice(0, 80),
          }))
      : [];
  const byDate = new Map();
  const conflictingDates = new Set();
  for (const entry of rows) {
    const rowIssues = [];
    const toktrack =
      Array.isArray(payload) ||
      (isObject(entry) && ('total_input_tokens' in entry || 'models' in entry));
    const day = normalizeDay(entry, toktrack, rowIssues, persisted);
    for (const issue of rowIssues) addIssue(issues, issue.date, issue.field, issue.code);
    if (!day || rowIssues.length > 0) continue;
    const existing = byDate.get(day.date);
    if (existing && daySignature(existing) !== daySignature(day)) {
      addIssue(issues, day.date, 'daily', 'conflicting_duplicate');
      conflictingDates.add(day.date);
    } else if (!existing) {
      byDate.set(day.date, day);
    }
  }
  if (issues.length && !persisted) {
    const first = issues[0];
    const error = new Error(
      `Invalid usage data: ${first.date || 'daily'} / ${first.field} (${first.code}).`,
    );
    error.issues = issues;
    throw error;
  }
  const daily = [...byDate.values()]
    .filter((day) => !conflictingDates.has(day.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!daily.length && !persisted) throw new Error('Keine Nutzungsdaten gefunden.');
  const totals = computeTotals(daily);
  for (const [field, value] of Object.entries(totals)) {
    if (!Number.isFinite(value) || (field !== 'totalCost' && !Number.isSafeInteger(value))) {
      throw new Error(`Invalid aggregate usage total: ${field}.`);
    }
  }
  const qualityIssues = [...historicalIssues, ...issues].slice(0, MAX_ISSUES);
  return { daily, totals, ...(qualityIssues.length ? { qualityIssues } : {}) };
}

module.exports = { normalizeIncomingData };
