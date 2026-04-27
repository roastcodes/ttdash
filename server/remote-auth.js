const crypto = require('crypto');
const { isLoopbackHost } = require('./runtime.js');

const AUTH_COOKIE_NAME = 'ttdash_auth';
const AUTH_QUERY_PARAM = 'ttdash_token';
const AUTH_TOKEN_MIN_LENGTH = 24;
const AUTH_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;
const AUTH_REALM = 'TTDash API';
const LOCAL_SESSION_TOKEN_BYTES = 32;

// Backward-compatible names for the existing remote-auth tests and imports.
const REMOTE_AUTH_COOKIE_NAME = AUTH_COOKIE_NAME;
const REMOTE_AUTH_QUERY_PARAM = AUTH_QUERY_PARAM;
const REMOTE_AUTH_TOKEN_MIN_LENGTH = AUTH_TOKEN_MIN_LENGTH;

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
    `Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`,
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

function createSessionToken() {
  return crypto.randomBytes(LOCAL_SESSION_TOKEN_BYTES).toString('base64url');
}

function createServerAuth({
  bindHost,
  allowRemoteBind,
  remoteToken,
  localToken,
  token,
  requireLocalAuth = true,
  tokenFactory = createSessionToken,
}) {
  const remoteAuthRequired = !isLoopbackHost(bindHost) && allowRemoteBind;
  const localAuthRequired = !remoteAuthRequired && requireLocalAuth;
  const authRequired = remoteAuthRequired || localAuthRequired;
  const mode = remoteAuthRequired ? 'remote' : localAuthRequired ? 'local' : 'none';
  const configuredToken = remoteAuthRequired
    ? (remoteToken ?? token)
    : localAuthRequired
      ? (localToken ?? token ?? tokenFactory())
      : '';
  const normalizedToken = normalizeToken(configuredToken);
  const expectedDigest =
    normalizedToken.length >= AUTH_TOKEN_MIN_LENGTH ? hashToken(normalizedToken) : null;

  function getConfigurationError() {
    if (!authRequired) {
      return null;
    }

    if (!normalizedToken) {
      if (remoteAuthRequired) {
        return createConfigurationError(
          'Remote binding requires TTDASH_REMOTE_TOKEN when TTDASH_ALLOW_REMOTE=1 is used.',
          'REMOTE_BIND_REQUIRES_TOKEN',
        );
      }

      return createConfigurationError(
        'Local session authentication requires a generated session token.',
        'LOCAL_AUTH_TOKEN_MISSING',
      );
    }

    if (normalizedToken.length < AUTH_TOKEN_MIN_LENGTH) {
      if (remoteAuthRequired) {
        return createConfigurationError(
          `TTDASH_REMOTE_TOKEN must be at least ${AUTH_TOKEN_MIN_LENGTH} characters long for remote binding.`,
          'REMOTE_BIND_TOKEN_TOO_SHORT',
        );
      }

      return createConfigurationError(
        `Local session authentication token must be at least ${AUTH_TOKEN_MIN_LENGTH} characters long.`,
        'LOCAL_AUTH_TOKEN_TOO_SHORT',
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
    if (!authRequired) {
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
        'WWW-Authenticate': `Bearer realm="${AUTH_REALM}"`,
      },
    };
  }

  function resolveBootstrapResponse(url) {
    if (!localAuthRequired || !url.searchParams.has(AUTH_QUERY_PARAM)) {
      return null;
    }

    const bootstrapToken = url.searchParams.get(AUTH_QUERY_PARAM) || '';
    if (!matchesToken(bootstrapToken)) {
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'WWW-Authenticate': `Bearer realm="${AUTH_REALM}"`,
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
    if (!localAuthRequired || getConfigurationError()) {
      return url;
    }

    const nextUrl = new URL(url);
    nextUrl.searchParams.set(AUTH_QUERY_PARAM, normalizedToken);
    return nextUrl.toString();
  }

  function getAuthorizationHeader() {
    if (!authRequired || getConfigurationError()) {
      return null;
    }

    return `Bearer ${normalizedToken}`;
  }

  return {
    cookieName: AUTH_COOKIE_NAME,
    queryParam: AUTH_QUERY_PARAM,
    mode,
    isRequired: () => authRequired,
    isLocalRequired: () => localAuthRequired,
    isRemoteRequired: () => remoteAuthRequired,
    ensureConfigured,
    getConfigurationError,
    validateApiRequest,
    resolveBootstrapResponse,
    createBootstrapUrl,
    getAuthorizationHeader,
  };
}

function createRemoteAuth(options) {
  return createServerAuth(options);
}

module.exports = {
  AUTH_COOKIE_NAME,
  AUTH_QUERY_PARAM,
  AUTH_TOKEN_MIN_LENGTH,
  REMOTE_AUTH_COOKIE_NAME,
  REMOTE_AUTH_QUERY_PARAM,
  REMOTE_AUTH_TOKEN_MIN_LENGTH,
  createServerAuth,
  createRemoteAuth,
};
