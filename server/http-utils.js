function createHttpUtils({ apiPrefix, maxBodySize, securityHeaders }) {
  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalSize = 0;
      let settled = false;

      const cleanup = () => {
        req.off('data', onData);
        req.off('end', onEnd);
        req.off('error', onError);
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

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', onError);
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
    if (pathname.startsWith(apiPrefix + '/')) {
      return pathname.slice(apiPrefix.length);
    }
    if (pathname === apiPrefix) {
      return '/';
    }
    if (pathname.startsWith('/api/')) {
      return pathname.slice(4);
    }
    if (pathname === '/api') {
      return '/';
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

  function hasTrustedOrigin(req) {
    const originHeader = getHeaderValue(req, 'origin').trim();
    if (!originHeader) {
      return true;
    }

    const hostHeader = getHeaderValue(req, 'host').trim();
    if (!hostHeader || originHeader === 'null') {
      return false;
    }

    try {
      const origin = new URL(originHeader);
      return origin.host === hostHeader;
    } catch {
      return false;
    }
  }

  function isCrossSiteFetch(req) {
    return getHeaderValue(req, 'sec-fetch-site').trim().toLowerCase() === 'cross-site';
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
    validateMutationRequest,
  };
}

module.exports = {
  createHttpUtils,
};
