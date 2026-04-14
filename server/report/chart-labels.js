const TOP_MODEL_CHART_LABEL_MAX_LENGTH = 34;

function truncateTopModelChartLabel(value) {
  const stringValue = String(value || '');
  if (stringValue.length <= TOP_MODEL_CHART_LABEL_MAX_LENGTH) return stringValue;
  return `${stringValue.slice(0, Math.max(1, TOP_MODEL_CHART_LABEL_MAX_LENGTH - 1)).trimEnd()}…`;
}

module.exports = {
  TOP_MODEL_CHART_LABEL_MAX_LENGTH,
  truncateTopModelChartLabel,
};
