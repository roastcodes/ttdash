const { createHttpRequestGuards } = require('./http-request-guards.js');

function createHttpUtils({ apiPrefix, maxBodySize, securityHeaders, bindHost }) {
  const requestGuards = createHttpRequestGuards({ bindHost });

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

  function json(res, status, data, headers = {}) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      ...securityHeaders,
      ...headers,
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

  return {
    readBody,
    json,
    sendBuffer,
    resolveApiPath,
    validateRequestHost: requestGuards.validateRequestHost,
    validateMutationRequest: requestGuards.validateMutationRequest,
  };
}

module.exports = {
  createHttpUtils,
};
