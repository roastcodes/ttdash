const crypto = require('crypto');

const CSP_NONCE_META_NAME = 'ttdash-csp-nonce';

const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function createCspNonce() {
  return crypto.randomBytes(18).toString('base64url');
}

function createContentSecurityPolicy({ nonce } = {}) {
  const styleSources = ["'self'"];

  if (nonce) {
    styleSources.push(`'nonce-${nonce}'`);
  }

  return [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    `style-src ${styleSources.join(' ')}`,
    `style-src-elem ${styleSources.join(' ')}`,
    "style-src-attr 'none'",
    "script-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function createSecurityHeaders(options = {}) {
  return {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': createContentSecurityPolicy(options),
  };
}

function injectCspNonceMeta(html, nonce) {
  if (!nonce || html.includes(`name="${CSP_NONCE_META_NAME}"`)) {
    return html;
  }

  const metaTag = `<meta name="${CSP_NONCE_META_NAME}" content="${nonce}" />`;
  const headMatch = html.match(/<head\b[^>]*>/i);
  if (headMatch) {
    return html.replace(headMatch[0], `${headMatch[0]}\n    ${metaTag}`);
  }

  return `${metaTag}\n${html}`;
}

function prepareHtmlResponse(html) {
  const nonce = createCspNonce();

  return {
    body: injectCspNonceMeta(html, nonce),
    headers: createSecurityHeaders({ nonce }),
    nonce,
  };
}

module.exports = {
  CSP_NONCE_META_NAME,
  createContentSecurityPolicy,
  createCspNonce,
  createSecurityHeaders,
  injectCspNonceMeta,
  prepareHtmlResponse,
};
