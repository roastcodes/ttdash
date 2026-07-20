const net = require('net');

const DOCKER_DEFAULT_TRUSTED_HOSTS = ['localhost', '127.0.0.1', '::1'];

function normalizeTrustedHost(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

  if (!normalized) {
    return '';
  }

  if (net.isIP(normalized)) {
    return normalized;
  }

  if (
    normalized.length > 253 ||
    normalized.includes('://') ||
    normalized.includes('/') ||
    normalized.includes(':') ||
    normalized.includes('*')
  ) {
    return '';
  }

  const labels = normalized.endsWith('.')
    ? normalized.slice(0, -1).split('.')
    : normalized.split('.');
  if (
    labels.some(
      (label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    return '';
  }

  return labels.join('.');
}

function parseTrustedHosts(value, { dockerMode = false } = {}) {
  const configuredValues = String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const rawValues =
    dockerMode && configuredValues.length === 0 ? DOCKER_DEFAULT_TRUSTED_HOSTS : configuredValues;
  const trustedHosts = [];

  for (const rawValue of rawValues) {
    const normalized = normalizeTrustedHost(rawValue);
    if (!normalized) {
      const error = new Error(
        `Invalid TTDASH_TRUSTED_HOSTS entry "${rawValue}". Use exact hostnames or IP addresses without schemes, ports, paths, or wildcards.`,
      );
      error.code = 'INVALID_TRUSTED_HOST';
      throw error;
    }
    if (!trustedHosts.includes(normalized)) {
      trustedHosts.push(normalized);
    }
  }

  return trustedHosts;
}

module.exports = {
  DOCKER_DEFAULT_TRUSTED_HOSTS,
  normalizeTrustedHost,
  parseTrustedHosts,
};
