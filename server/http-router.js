function createHttpRouter({
  fs,
  path,
  staticRoot,
  securityHeaders,
  prepareHtmlResponse = (html) => ({ body: html, headers: securityHeaders }),
  httpUtils,
  remoteAuth,
  dataRuntime,
  autoImportRuntime,
  generatePdfReport,
  getRuntimeSnapshot,
}) {
  const {
    json,
    readBody,
    resolveApiPath,
    sendBuffer,
    validateMutationRequest,
    validateRequestHost,
  } = httpUtils;
  const {
    extractSettingsImportPayload,
    extractUsageImportPayload,
    isPayloadTooLargeError,
    isPersistedStateError,
    mergeUsageData,
    readData,
    readSettings,
    unlinkIfExists,
    updateDataLoadState,
    updateSettings,
    withFileMutationLock,
    withSettingsAndDataMutationLock,
    writeData,
    writeSettings,
    normalizeSettings,
    paths: { dataFile, settingsFile },
  } = dataRuntime;
  const {
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    acquireAutoImportLease,
    lookupLatestToktrackVersion,
    performAutoImport,
    toAutoImportErrorEvent,
  } = autoImportRuntime;

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

  function sendSSE(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

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
    const htmlResponse = isHtml ? prepareHtmlResponse(data.toString('utf8')) : null;
    const responseBody = htmlResponse ? htmlResponse.body : data;
    const responseSecurityHeaders = htmlResponse ? htmlResponse.headers : securityHeaders;

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(reqPath),
      ...responseSecurityHeaders,
    });
    res.end(responseBody);
  }

  function readStaticFile(reqPath) {
    if (fs.promises && typeof fs.promises.readFile === 'function') {
      return fs.promises.readFile(reqPath);
    }

    return new Promise((resolve, reject) => {
      fs.readFile(reqPath, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  }

  async function serveFile(res, reqPath) {
    try {
      const data = await readStaticFile(reqPath);
      sendStaticFile(res, reqPath, data);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        try {
          const indexPath = path.join(staticRoot, 'index.html');
          const html = await readStaticFile(indexPath);
          sendStaticFile(res, indexPath, html);
        } catch {
          writeStaticErrorResponse(res, 500, 'Internal Server Error');
        }
        return;
      }

      const invalidPath = error && error.code === 'ERR_INVALID_ARG_VALUE';
      const directoryRead = error && error.code === 'EISDIR';
      writeStaticErrorResponse(
        res,
        invalidPath ? 400 : directoryRead ? 403 : 500,
        invalidPath
          ? 'Invalid request path'
          : directoryRead
            ? 'Access denied'
            : 'Internal Server Error',
      );
    }
  }

  async function handleServerRequest(req, res) {
    let url;
    let pathname;

    try {
      url = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return json(res, 400, { message: 'Invalid request path' });
    }

    const hostValidationError = validateRequestHost(req);
    if (hostValidationError) {
      return json(res, hostValidationError.status, { message: hostValidationError.message });
    }

    const apiPath = resolveApiPath(pathname);

    if (apiPath !== null) {
      const authError = remoteAuth?.validateApiRequest(req);
      if (authError) {
        return json(res, authError.status, { message: authError.message }, authError.headers);
      }
    }

    if (apiPath === null && (pathname === '/api' || pathname.startsWith('/api/'))) {
      return json(res, 404, { message: 'Not Found' });
    }

    if (apiPath === '/usage') {
      if (req.method === 'GET') {
        let data;
        try {
          data = readData();
        } catch (error) {
          if (isPersistedStateError(error, 'usage')) {
            return json(res, 500, { message: error.message });
          }
          throw error;
        }
        return json(
          res,
          200,
          data || {
            daily: [],
            totals: {
              inputTokens: 0,
              outputTokens: 0,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              thinkingTokens: 0,
              totalCost: 0,
              totalTokens: 0,
              requestCount: 0,
            },
          },
        );
      }
      if (req.method === 'DELETE') {
        const validationError = validateMutationRequest(req);
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }
        await withSettingsAndDataMutationLock(async () => {
          await unlinkIfExists(dataFile);
          await updateDataLoadState({
            lastLoadedAt: null,
            lastLoadSource: null,
          });
        });
        return json(res, 200, { success: true });
      }
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/runtime') {
      if (req.method !== 'GET') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      return json(res, 200, getRuntimeSnapshot());
    }

    if (apiPath === '/settings') {
      if (req.method === 'GET') {
        try {
          return json(res, 200, readSettings());
        } catch (error) {
          if (isPersistedStateError(error, 'settings')) {
            return json(res, 500, { message: error.message });
          }
          throw error;
        }
      }

      if (req.method === 'DELETE') {
        const validationError = validateMutationRequest(req);
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }
        await withFileMutationLock(settingsFile, async () => {
          await unlinkIfExists(settingsFile);
        });
        return json(res, 200, { success: true, settings: readSettings() });
      }

      if (req.method === 'PATCH') {
        const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }
        try {
          const body = await readBody(req);
          return json(res, 200, await updateSettings(body));
        } catch (error) {
          if (isPayloadTooLargeError(error)) {
            return json(res, 413, { message: 'Settings request too large' });
          }
          return json(res, 400, { message: error.message || 'Invalid settings request' });
        }
      }

      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/settings/import') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }

      try {
        const body = await readBody(req);
        const importedSettings = normalizeSettings(extractSettingsImportPayload(body));
        await withFileMutationLock(settingsFile, async () => {
          await writeSettings(importedSettings);
        });
        return json(res, 200, readSettings());
      } catch (error) {
        if (isPayloadTooLargeError(error)) {
          return json(res, 413, { message: 'Settings file too large' });
        }
        return json(res, 400, { message: error.message || 'Invalid settings file' });
      }
    }

    if (apiPath === '/upload') {
      if (req.method === 'POST') {
        const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }

        try {
          const body = await readBody(req);
          const normalized = dataRuntime.normalizeIncomingData
            ? dataRuntime.normalizeIncomingData(body)
            : null;
          const nextData = normalized || body;
          await withSettingsAndDataMutationLock(async () => {
            await writeData(nextData);
            await updateDataLoadState({
              lastLoadedAt: new Date().toISOString(),
              lastLoadSource: 'file',
            });
          });
          return json(res, 200, {
            days: nextData.daily.length,
            totalCost: nextData.totals.totalCost,
          });
        } catch (error) {
          const status = isPayloadTooLargeError(error) ? 413 : 400;
          const message = isPayloadTooLargeError(error)
            ? 'File too large (max. 10 MB)'
            : error.message || 'Invalid JSON';
          return json(res, status, { message });
        }
      }
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/usage/import') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }

      try {
        const body = await readBody(req);
        const importedData = dataRuntime.normalizeIncomingData
          ? dataRuntime.normalizeIncomingData(extractUsageImportPayload(body))
          : extractUsageImportPayload(body);
        const result = await withSettingsAndDataMutationLock(async () => {
          const currentData = readData();
          const merged = mergeUsageData(currentData, importedData);
          await writeData(merged.data);
          await updateDataLoadState({
            lastLoadedAt: new Date().toISOString(),
            lastLoadSource: 'file',
          });
          return merged;
        });
        return json(res, 200, result.summary);
      } catch (error) {
        if (isPayloadTooLargeError(error)) {
          return json(res, 413, { message: 'Usage backup file too large' });
        }
        if (isPersistedStateError(error, 'usage')) {
          return json(res, 500, { message: error.message });
        }
        return json(res, 400, { message: error.message || 'Invalid usage backup file' });
      }
    }

    if (apiPath === '/auto-import/stream') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      const validationError = validateMutationRequest(req);
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }

      let autoImportLease;
      try {
        autoImportLease = acquireAutoImportLease();
      } catch (error) {
        if (error?.messageKey !== 'autoImportRunning') {
          throw error;
        }
        return json(res, 409, {
          message: formatAutoImportMessageEvent(createAutoImportMessageEvent('autoImportRunning')),
        });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...securityHeaders,
      });

      let aborted = false;
      req.on('close', () => {
        aborted = true;
      });

      try {
        const result = await performAutoImport({
          source: 'auto-import',
          onCheck: (event) => {
            if (!aborted) {
              sendSSE(res, 'check', event);
            }
          },
          onProgress: (event) => {
            if (!aborted) {
              sendSSE(res, 'progress', event);
            }
          },
          onOutput: (line) => {
            if (!aborted) {
              sendSSE(res, 'stderr', { line });
            }
          },
          signalOnClose: (close) => {
            req.on('close', close);
          },
          lease: autoImportLease,
        });

        if (aborted) {
          return;
        }

        sendSSE(res, 'success', result);
        sendSSE(res, 'done', {});
        res.end();
      } catch (error) {
        if (aborted) {
          return;
        }
        sendSSE(res, 'error', toAutoImportErrorEvent(error));
        sendSSE(res, 'done', {});
        res.end();
      } finally {
        autoImportLease.release();
      }
      return;
    }

    if (apiPath === '/toktrack/version-status') {
      if (req.method !== 'GET') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      return json(res, 200, await lookupLatestToktrackVersion());
    }

    if (apiPath === '/report/pdf') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }

      let data;
      try {
        data = readData();
      } catch (error) {
        if (isPersistedStateError(error, 'usage')) {
          return json(res, 500, { message: error.message });
        }
        throw error;
      }
      if (!data || !Array.isArray(data.daily) || data.daily.length === 0) {
        return json(res, 400, { message: 'No data available for the report.' });
      }

      let body;
      try {
        body = await readBody(req);
      } catch (error) {
        const status = isPayloadTooLargeError(error) ? 413 : 400;
        return json(res, status, {
          message: isPayloadTooLargeError(error)
            ? 'Report request too large'
            : 'Invalid report request',
        });
      }

      try {
        const result = await generatePdfReport(data.daily, body || {});
        return sendBuffer(
          res,
          200,
          {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${result.filename}"`,
          },
          result.buffer,
        );
      } catch (error) {
        const message = error && error.message ? error.message : 'PDF generation failed';
        const status = error && error.code === 'TYPST_MISSING' ? 503 : 500;
        return json(res, status, { message });
      }
    }

    if (apiPath !== null) {
      return json(res, 404, { message: 'API endpoint not found' });
    }

    const bootstrapResponse = remoteAuth?.resolveBootstrapResponse(url);
    if (bootstrapResponse) {
      res.writeHead(bootstrapResponse.status, {
        ...securityHeaders,
        ...bootstrapResponse.headers,
      });
      res.end(bootstrapResponse.body);
      return;
    }

    const safePath = pathname === '/' ? '/index.html' : pathname;
    if (safePath.includes('\0')) {
      return json(res, 400, { message: 'Invalid request path' });
    }
    const resolvedStaticRoot = path.resolve(staticRoot);
    const filePath = path.resolve(staticRoot, `.${safePath}`);

    if (
      filePath === resolvedStaticRoot ||
      (!filePath.startsWith(resolvedStaticRoot + path.sep) &&
        filePath !== path.resolve(staticRoot, 'index.html'))
    ) {
      return json(res, 403, { message: 'Access denied' });
    }

    await serveFile(res, filePath);
  }

  return {
    handleServerRequest,
  };
}

module.exports = {
  createHttpRouter,
};
