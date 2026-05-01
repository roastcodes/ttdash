function formatCurrency(value, locale = 'de-CH') {
  const numericValue = Number(value) || 0;
  const fractionDigits = Math.abs(numericValue) >= 100 ? 0 : 2;

  // Toktrack reports usage cost in USD; server logs keep the app's default Swiss locale.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numericValue);
}

/** Formats rounded whole-number counts for server startup/status logs. */
function formatInteger(value, locale = 'de-CH') {
  return new Intl.NumberFormat(locale).format(Math.round(Number(value) || 0));
}

// Server CLI/status copy is English; locale only controls number formatting.
function formatDayCount(value, locale = 'de-CH') {
  const roundedValue = Math.round(Number(value) || 0);
  const dayLabel = roundedValue === 1 ? 'day' : 'days';

  return `${formatInteger(roundedValue, locale)} ${dayLabel}`;
}

function formatErrorMessage(error, fallbackMessage = 'Unknown error') {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error === null || error === undefined) {
    return fallbackMessage;
  }

  if (Object.prototype.toString.call(error) === '[object Object]') {
    try {
      const serializedError = JSON.stringify(error);
      if (serializedError && serializedError.trim()) {
        return serializedError;
      }
    } catch {
      return fallbackMessage;
    }
  }

  const message = String(error).trim();
  return message || fallbackMessage;
}

module.exports = {
  formatCurrency,
  formatDayCount,
  formatErrorMessage,
  formatInteger,
};
