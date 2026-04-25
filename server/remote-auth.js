const crypto = require('crypto');
const { isLoopbackHost } = require('./runtime.js');

const REMOTE_AUTH_COOKIE_NAME = 'ttdash_remote_auth';
const REMOTE_AUTH_QUERY_PARAM = 'ttdash_token';
const REMOTE_AUTH_TOKEN_MIN_LENGTH = 24;
const REMOTE_AUTH_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;
const REMOTE_AUTH_REALM = 'TTDash Remote API';

function normalizeToken(value) {
  return String(value || '').trim();
}

function getHeaderValue(req, name) {
  const headers = req.headers || {};
  const directValue = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(directValue)) {
    return directValue[0] || '';
  }
  if (typeof directValue === 'string') {
    return directValue;
  }

  const expectedName = name.toLowerCase();
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() !== expectedName) {
      continue;
    }
    if (Array.isArray(headerValue)) {
      return headerValue[0] || '';
    }
    return typeof headerValue === 'string' ? headerValue : '';
  }

  return '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest();
}

function timingSafeTokenEquals(candidate, expectedDigest) {
  const normalizedCandidate = normalizeToken(candidate);
  if (!normalizedCandidate) {
    return false;
  }

  return crypto.timingSafeEqual(hashToken(normalizedCandidate), expectedDigest);
}

function parseCookieHeader(cookieHeader) {
  const cookies = new Map();
  for (const part of String(cookieHeader || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const name = separatorIndex === -1 ? trimmed : trimmed.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : trimmed.slice(separatorIndex + 1);
    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      cookies.set(name, rawValue);
    }
  }
  return cookies;
}

function extractBearerToken(req) {
  const authorizationHeader = getHeaderValue(req, 'authorization').trim();
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function extractHeaderToken(req) {
  return getHeaderValue(req, 'x-ttdash-remote-token').trim();
}

function extractCookieToken(req) {
  return parseCookieHeader(getHeaderValue(req, 'cookie')).get(REMOTE_AUTH_COOKIE_NAME) || '';
}

function buildCookieHeader(token) {
  return [
    `${REMOTE_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${REMOTE_AUTH_COOKIE_MAX_AGE_SECONDS}`,
  ].join('; ');
}

function buildBootstrapRedirectLocation(url) {
  const nextUrl = new URL(`${url.pathname}${url.search}`, 'http://ttdash.local');
  nextUrl.searchParams.delete(REMOTE_AUTH_QUERY_PARAM);
  return `${nextUrl.pathname}${nextUrl.search}` || '/';
}

function createConfigurationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createRemoteAuth({ bindHost, allowRemoteBind, token }) {
  const remoteAuthRequired = !isLoopbackHost(bindHost) && allowRemoteBind;
  const normalizedToken = normalizeToken(token);
  const expectedDigest =
    normalizedToken.length >= REMOTE_AUTH_TOKEN_MIN_LENGTH ? hashToken(normalizedToken) : null;

  function getConfigurationError() {
    if (!remoteAuthRequired) {
      return null;
    }

    if (!normalizedToken) {
      return createConfigurationError(
        'Remote binding requires TTDASH_REMOTE_TOKEN when TTDASH_ALLOW_REMOTE=1 is used.',
        'REMOTE_BIND_REQUIRES_TOKEN',
      );
    }

    if (normalizedToken.length < REMOTE_AUTH_TOKEN_MIN_LENGTH) {
      return createConfigurationError(
        `TTDASH_REMOTE_TOKEN must be at least ${REMOTE_AUTH_TOKEN_MIN_LENGTH} characters long for remote binding.`,
        'REMOTE_BIND_TOKEN_TOO_SHORT',
      );
    }

    return null;
  }

  function ensureConfigured() {
    const error = getConfigurationError();
    if (error) {
      throw error;
    }
  }

  function matchesToken(candidate) {
    return Boolean(expectedDigest && timingSafeTokenEquals(candidate, expectedDigest));
  }

  function validateApiRequest(req) {
    if (!remoteAuthRequired) {
      return null;
    }

    if (
      matchesToken(extractBearerToken(req)) ||
      matchesToken(extractHeaderToken(req)) ||
      matchesToken(extractCookieToken(req))
    ) {
      return null;
    }

    return {
      status: 401,
      message: 'Authentication required',
      headers: {
        'Cache-Control': 'no-store',
        'WWW-Authenticate': `Bearer realm="${REMOTE_AUTH_REALM}"`,
      },
    };
  }

  function resolveBootstrapResponse(url) {
    if (!remoteAuthRequired || !url.searchParams.has(REMOTE_AUTH_QUERY_PARAM)) {
      return null;
    }

    const bootstrapToken = url.searchParams.get(REMOTE_AUTH_QUERY_PARAM) || '';
    if (!matchesToken(bootstrapToken)) {
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'WWW-Authenticate': `Bearer realm="${REMOTE_AUTH_REALM}"`,
        },
        body: JSON.stringify({ message: 'Authentication required' }),
      };
    }

    return {
      status: 303,
      headers: {
        Location: buildBootstrapRedirectLocation(url),
        'Set-Cookie': buildCookieHeader(normalizedToken),
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  }

  function createBootstrapUrl(url) {
    if (!remoteAuthRequired || getConfigurationError()) {
      return url;
    }

    const nextUrl = new URL(url);
    nextUrl.searchParams.set(REMOTE_AUTH_QUERY_PARAM, normalizedToken);
    return nextUrl.toString();
  }

  function getAuthorizationHeader() {
    if (!remoteAuthRequired || getConfigurationError()) {
      return null;
    }

    return `Bearer ${normalizedToken}`;
  }

  return {
    cookieName: REMOTE_AUTH_COOKIE_NAME,
    queryParam: REMOTE_AUTH_QUERY_PARAM,
    isRequired: () => remoteAuthRequired,
    ensureConfigured,
    getConfigurationError,
    validateApiRequest,
    resolveBootstrapResponse,
    createBootstrapUrl,
    getAuthorizationHeader,
  };
}

module.exports = {
  REMOTE_AUTH_COOKIE_NAME,
  REMOTE_AUTH_QUERY_PARAM,
  REMOTE_AUTH_TOKEN_MIN_LENGTH,
  createRemoteAuth,
};
