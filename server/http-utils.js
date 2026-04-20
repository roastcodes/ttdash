const { isLoopbackHost } = require('./runtime.js');

function normalizeHostname(host) {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
}

function isWildcardHost(host) {
  const normalized = normalizeHostname(host);
  return normalized === '0.0.0.0' || normalized === '::';
}

function createHttpUtils({ apiPrefix, maxBodySize, securityHeaders, bindHost }) {
  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalSize = 0;
      let settled = false;

      const cleanup = () => {
        req.off('data', onData);
        req.off('end', onEnd);
        req.off('error', onError);
        req.off('close', onClose);
      };

      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const resolveOnce = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const onData = (chunk) => {
        totalSize += chunk.length;
        if (totalSize > maxBodySize) {
          const error = new Error('Payload too large');
          error.code = 'PAYLOAD_TOO_LARGE';
          rejectOnce(error);
          req.resume();
          return;
        }
        chunks.push(chunk);
      };

      const onEnd = () => {
        try {
          resolveOnce(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (error) {
          rejectOnce(error);
        }
      };

      const onError = (error) => {
        if (settled && error && error.code === 'ECONNRESET') {
          return;
        }
        rejectOnce(error);
      };

      const onClose = () => {
        if (!req.readableEnded) {
          rejectOnce(new Error('Request body stream closed before the payload finished'));
        }
      };

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', onError);
      req.on('close', onClose);
    });
  }

  function json(res, status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      ...securityHeaders,
    });
    res.end(JSON.stringify(data));
  }

  function sendBuffer(res, status, headers, buffer) {
    res.writeHead(status, {
      'Content-Length': buffer.length,
      ...headers,
      ...securityHeaders,
    });
    res.end(buffer);
  }

  function resolveApiPath(pathname) {
    if (pathname === apiPrefix) {
      return '/';
    }
    if (pathname.startsWith(apiPrefix + '/')) {
      return pathname.slice(apiPrefix.length);
    }
    return null;
  }

  function getHeaderValue(req, name) {
    const value = req.headers[name];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return typeof value === 'string' ? value : '';
  }

  function hasJsonContentType(req) {
    const contentType = getHeaderValue(req, 'content-type');
    if (!contentType) {
      return false;
    }

    return contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
  }

  function getHostHeaderHost(req) {
    const hostHeader = getHeaderValue(req, 'host').trim();
    if (!hostHeader) {
      return '';
    }

    if (hostHeader.startsWith('[')) {
      const closingBracketIndex = hostHeader.indexOf(']');
      if (closingBracketIndex === -1) {
        return '';
      }
      return normalizeHostname(hostHeader.slice(0, closingBracketIndex + 1));
    }

    const colonMatches = hostHeader.match(/:/g) || [];
    if (colonMatches.length <= 1) {
      return normalizeHostname(hostHeader.split(':', 1)[0]);
    }

    return normalizeHostname(hostHeader);
  }

  function getNormalizedHostHeader(req) {
    const hostHeader = getHeaderValue(req, 'host').trim();
    if (!hostHeader) {
      return '';
    }

    if (hostHeader.startsWith('[')) {
      const closingBracketIndex = hostHeader.indexOf(']');
      if (closingBracketIndex === -1) {
        return '';
      }

      const hostname = normalizeHostname(hostHeader.slice(0, closingBracketIndex + 1));
      const remainder = hostHeader.slice(closingBracketIndex + 1);
      return remainder ? `[${hostname}]${remainder}` : `[${hostname}]`;
    }

    const colonMatches = hostHeader.match(/:/g) || [];
    if (colonMatches.length <= 1) {
      const [hostname, port = ''] = hostHeader.split(':');
      return port ? `${normalizeHostname(hostname)}:${port}` : normalizeHostname(hostname);
    }

    return normalizeHostname(hostHeader);
  }

  function getSocketLocalAddress(req) {
    return normalizeHostname(req.socket?.localAddress || '');
  }

  function hasTrustedHost(req) {
    const hostHeaderHost = getHostHeaderHost(req);
    if (!hostHeaderHost) {
      return false;
    }

    const normalizedBindHost = normalizeHostname(bindHost);
    const socketLocalAddress = getSocketLocalAddress(req);

    if (isLoopbackHost(normalizedBindHost) || isLoopbackHost(socketLocalAddress)) {
      return isLoopbackHost(hostHeaderHost);
    }

    if (hostHeaderHost === normalizedBindHost) {
      return true;
    }

    if (socketLocalAddress && hostHeaderHost === socketLocalAddress) {
      return true;
    }

    if (isWildcardHost(normalizedBindHost)) {
      return hostHeaderHost === socketLocalAddress;
    }

    return false;
  }

  function hasTrustedOrigin(req) {
    const originHeader = getHeaderValue(req, 'origin').trim();
    const hostHeader = getNormalizedHostHeader(req);
    if (!originHeader || !hostHeader || originHeader === 'null') {
      return false;
    }

    try {
      const origin = new URL(originHeader);
      return origin.host.toLowerCase() === hostHeader;
    } catch {
      return false;
    }
  }

  function isCrossSiteFetch(req) {
    return getHeaderValue(req, 'sec-fetch-site').trim().toLowerCase() === 'cross-site';
  }

  function validateRequestHost(req) {
    if (hasTrustedHost(req)) {
      return null;
    }

    return {
      status: 403,
      message: 'Untrusted host header',
    };
  }

  function validateMutationRequest(req, { requiresJsonContentType = false } = {}) {
    if (isCrossSiteFetch(req) || !hasTrustedOrigin(req)) {
      return {
        status: 403,
        message: 'Cross-site requests are not allowed',
      };
    }

    if (requiresJsonContentType && !hasJsonContentType(req)) {
      return {
        status: 415,
        message: 'Content-Type must be application/json',
      };
    }

    return null;
  }

  return {
    readBody,
    json,
    sendBuffer,
    resolveApiPath,
    validateRequestHost,
    validateMutationRequest,
  };
}

module.exports = {
  createHttpUtils,
};
