const crypto = require('crypto');
const net = require('net');
const { isLoopbackHost } = require('./runtime.js');

const AUTH_COOKIE_NAME = 'ttdash_auth';
const AUTH_QUERY_PARAM = 'ttdash_token';
const AUTH_TOKEN_MIN_LENGTH = 24;
const AUTH_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;
const AUTH_REALM = 'TTDash API';
const LOCAL_SESSION_TOKEN_BYTES = 32;
const REMOTE_SESSION_MAX_ENTRIES = 128;
const REMOTE_SESSION_RATE_LIMIT = 30;
const REMOTE_SESSION_FAILURE_RATE_LIMIT = 10;
const REMOTE_SESSION_RATE_CLIENT_MAX_ENTRIES = 256;
const REMOTE_SESSION_RATE_WINDOW_MS = 60 * 1000;

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

function buildCookieHeader(token, { secure = false, maxAge = AUTH_COOKIE_MAX_AGE_SECONDS } = {}) {
  const parts = [
    `${REMOTE_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function requestUsesHttps(req, secureCookies) {
  return Boolean(secureCookies || req.socket?.encrypted);
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
  remoteSessionTokenFactory = createSessionToken,
  now = Date.now,
  secureCookies = false,
  trustProxy = false,
  remoteSessionMaxEntries = REMOTE_SESSION_MAX_ENTRIES,
  remoteSessionRateLimit = REMOTE_SESSION_RATE_LIMIT,
  remoteSessionFailureRateLimit = REMOTE_SESSION_FAILURE_RATE_LIMIT,
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
  const remoteSessions = new Map();
  const remoteSessionIssueTimesByClient = new Map();
  const remoteSessionFailureTimesByClient = new Map();

  function hashTokenKey(tokenValue) {
    return hashToken(tokenValue).toString('hex');
  }

  function removeExpiredRemoteSessions(currentTime = now()) {
    for (const [digest, expiresAt] of remoteSessions) {
      if (expiresAt <= currentTime) {
        remoteSessions.delete(digest);
      }
    }
  }

  function getRemoteSessionClientKey(req) {
    if (trustProxy) {
      const forwardedAddress = getHeaderValue(req, 'x-forwarded-for').split(',', 1)[0].trim();
      if (net.isIP(forwardedAddress)) {
        return forwardedAddress;
      }
    }
    return String(req.socket?.remoteAddress || 'unknown');
  }

  function getActiveRateLimitTimes(store, clientKey, currentTime) {
    const issueTimes = store.get(clientKey);
    if (!issueTimes) {
      return [];
    }
    while (issueTimes[0] <= currentTime - REMOTE_SESSION_RATE_WINDOW_MS) {
      issueTimes.shift();
    }
    if (issueTimes.length === 0) {
      store.delete(clientKey);
    }
    return issueTimes;
  }

  function recordRateLimitAttempt(store, clientKey, currentTime) {
    let issueTimes = getActiveRateLimitTimes(store, clientKey, currentTime);
    if (issueTimes.length === 0) {
      while (store.size >= REMOTE_SESSION_RATE_CLIENT_MAX_ENTRIES) {
        const oldestClientKey = store.keys().next().value;
        if (typeof oldestClientKey !== 'string') break;
        store.delete(oldestClientKey);
      }
      issueTimes = [];
      store.set(clientKey, issueTimes);
    }
    issueTimes.push(currentTime);
  }

  function getRateLimitResponse(store, clientKey, limit, currentTime) {
    const issueTimes = getActiveRateLimitTimes(store, clientKey, currentTime);
    if (issueTimes.length < limit) {
      return null;
    }
    const retryAfterMs = issueTimes[0] + REMOTE_SESSION_RATE_WINDOW_MS - currentTime;
    return {
      status: 429,
      message: 'Too many authentication attempts',
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    };
  }

  function matchesRemoteSession(candidate) {
    if (!remoteAuthRequired || !normalizeToken(candidate)) {
      return false;
    }
    const currentTime = now();
    removeExpiredRemoteSessions(currentTime);
    const expiresAt = remoteSessions.get(hashTokenKey(candidate));
    return typeof expiresAt === 'number' && expiresAt > currentTime;
  }

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
      (localAuthRequired
        ? matchesToken(extractCookieToken(req))
        : matchesRemoteSession(extractCookieToken(req)))
    ) {
      return null;
    }

    return {
      status: 401,
      message: 'Authentication required',
      headers: {
        'Cache-Control': 'no-store',
        'WWW-Authenticate': `Bearer realm="${AUTH_REALM}"`,
        'X-TTDash-Auth-Mode': mode,
      },
    };
  }

  function createRemoteSessionResponse(req) {
    if (!remoteAuthRequired) {
      return null;
    }

    const currentTime = now();
    const clientKey = getRemoteSessionClientKey(req);
    const failureRateLimitResponse = getRateLimitResponse(
      remoteSessionFailureTimesByClient,
      clientKey,
      remoteSessionFailureRateLimit,
      currentTime,
    );
    if (failureRateLimitResponse) {
      return failureRateLimitResponse;
    }

    if (!matchesToken(extractBearerToken(req)) && !matchesToken(extractHeaderToken(req))) {
      recordRateLimitAttempt(remoteSessionFailureTimesByClient, clientKey, currentTime);
      return {
        status: 401,
        message: 'Authentication required',
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': `Bearer realm="${AUTH_REALM}"`,
          'X-TTDash-Auth-Mode': mode,
        },
      };
    }

    const issueRateLimitResponse = getRateLimitResponse(
      remoteSessionIssueTimesByClient,
      clientKey,
      remoteSessionRateLimit,
      currentTime,
    );
    if (issueRateLimitResponse) {
      return issueRateLimitResponse;
    }

    const sessionToken = normalizeToken(remoteSessionTokenFactory());
    if (sessionToken.length < AUTH_TOKEN_MIN_LENGTH) {
      return {
        status: 500,
        message: 'Remote session token generation failed',
        headers: { 'Cache-Control': 'no-store' },
      };
    }
    removeExpiredRemoteSessions(currentTime);
    while (remoteSessions.size >= remoteSessionMaxEntries) {
      const oldestDigest = remoteSessions.keys().next().value;
      if (typeof oldestDigest !== 'string') break;
      remoteSessions.delete(oldestDigest);
    }
    remoteSessions.set(
      hashTokenKey(sessionToken),
      currentTime + AUTH_COOKIE_MAX_AGE_SECONDS * 1000,
    );
    recordRateLimitAttempt(remoteSessionIssueTimesByClient, clientKey, currentTime);

    return {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': buildCookieHeader(sessionToken, {
          secure: requestUsesHttps(req, secureCookies),
        }),
      },
      body: '',
    };
  }

  function resolveBootstrapResponse(url, req = {}) {
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
        'Set-Cookie': buildCookieHeader(normalizedToken, {
          secure: requestUsesHttps(req, secureCookies),
        }),
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
    createRemoteSessionResponse,
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
