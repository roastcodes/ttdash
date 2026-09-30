const UNASSIGNED_MODEL = '__ttdash_unassigned__'

/** Resolves counter provenance without treating legacy missing counters as zero observations. */
function getRequestCountStatus(entry) {
  if (['known', 'partial', 'unknown'].includes(entry?.requestCountStatus)) {
    return entry.requestCountStatus
  }
  return entry?.requestCount > 0 ? 'known' : 'unknown'
}

/** Combines the provenance of two independently reported counter sets. */
function combineRequestCountStatus(left, right) {
  return left === right ? left : 'partial'
}

/** Tests whether a row contains any reported usage activity. */
function hasUsageActivity(entry) {
  return entry.totalCost > 0 || entry.totalTokens > 0 || entry.requestCount > 0
}

/** Converts a real ISO calendar date to a timezone-independent calendar ordinal. */
function calendarDay(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    return null
  }
  return timestamp / 86400000
}

/** Formats a calendar ordinal without local timezone or daylight-saving shifts. */
function calendarDate(day) {
  return new Date(day * 86400000).toISOString().slice(0, 10)
}

module.exports = {
  UNASSIGNED_MODEL,
  calendarDate,
  calendarDay,
  combineRequestCountStatus,
  getRequestCountStatus,
  hasUsageActivity,
}
