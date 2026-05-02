/** Creates the static asset and SPA fallback route handler. */
function createStaticRouteHandler({
  fs,
  path,
  staticRoot,
  securityHeaders,
  prepareHtmlResponse,
  json,
}) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  function getCacheControl(filePath) {
    if (filePath.includes(path.sep + 'assets' + path.sep)) {
      return 'public, max-age=31536000, immutable';
    }
    if (filePath.endsWith('.html')) {
      return 'no-cache';
    }
    return 'public, max-age=86400';
  }

  function writeStaticErrorResponse(res, status, message) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      ...securityHeaders,
    });
    res.end(JSON.stringify({ message }));
  }

  function sendStaticFile(res, reqPath, data) {
    const ext = path.extname(reqPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const htmlResponse =
      isHtml && typeof prepareHtmlResponse === 'function'
        ? prepareHtmlResponse(data.toString('utf8'))
        : null;
    const responseBody = htmlResponse ? htmlResponse.body : data;
    const responseSecurityHeaders = htmlResponse
      ? { ...securityHeaders, ...htmlResponse.headers }
      : securityHeaders;

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(reqPath),
      ...responseSecurityHeaders,
    });
    res.end(responseBody);
  }

  function readStaticFile(reqPath) {
    return fs.promises.readFile(reqPath);
  }

  function shouldServeSpaFallback(req, safePath) {
    const acceptHeader = req.headers?.accept || '';
    const acceptsHtml = String(
      Array.isArray(acceptHeader) ? acceptHeader[0] : acceptHeader,
    ).includes('text/html');
    // Preserve direct local navigation and simple test clients that omit Accept for app routes.
    return acceptsHtml || safePath.endsWith('/') || path.extname(safePath) === '';
  }

  async function serveFile(req, res, reqPath, safePath) {
    try {
      const data = await readStaticFile(reqPath);
      sendStaticFile(res, reqPath, data);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        if (!shouldServeSpaFallback(req, safePath)) {
          writeStaticErrorResponse(res, 404, 'Not Found');
          return;
        }

        try {
          const indexPath = path.join(staticRoot, 'index.html');
          const html = await readStaticFile(indexPath);
          sendStaticFile(res, indexPath, html);
        } catch {
          writeStaticErrorResponse(res, 500, 'Internal Server Error');
        }
        return;
      }

      const errorCode = error?.code;
      const staticErrorResponses = {
        ERR_INVALID_ARG_VALUE: { status: 400, message: 'Invalid request path' },
        EISDIR: { status: 403, message: 'Access denied' },
      };
      const response = staticErrorResponses[errorCode] || {
        status: 500,
        message: 'Internal Server Error',
      };
      writeStaticErrorResponse(res, response.status, response.message);
    }
  }

  async function handleStaticRequest(req, res, pathname) {
    const safePath = pathname === '/' ? '/index.html' : pathname;
    if (safePath.includes('\0')) {
      return json(res, 400, { message: 'Invalid request path' });
    }
    const resolvedStaticRoot = path.resolve(staticRoot);
    const filePath = path.resolve(staticRoot, `.${safePath}`);

    if (filePath === resolvedStaticRoot || !filePath.startsWith(resolvedStaticRoot + path.sep)) {
      return json(res, 403, { message: 'Access denied' });
    }

    await serveFile(req, res, filePath, safePath);
  }

  return {
    handleStaticRequest,
  };
}

module.exports = {
  createStaticRouteHandler,
};
