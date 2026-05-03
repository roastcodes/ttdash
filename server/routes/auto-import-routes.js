/** Creates the auto-import streaming API route handler. */
function createAutoImportRoutes({
  json,
  validateMutationRequest,
  securityHeaders,
  autoImportRuntime,
  sendSSE,
}) {
  const {
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    acquireAutoImportLease,
    performAutoImport,
    toAutoImportErrorEvent,
  } = autoImportRuntime;

  async function handleAutoImportRoutes(apiPath, req, res) {
    if (apiPath !== '/auto-import/stream') {
      return false;
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const validationError = validateMutationRequest(req);
    if (validationError) {
      return json(res, validationError.status, { message: validationError.message });
    }

    let autoImportLease;
    let aborted = false;
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

    try {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...securityHeaders,
      });

      // Local abort state gates SSE writes; performAutoImport gets its own close signal below.
      req.on('close', () => {
        aborted = true;
      });

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
          // This second close listener aborts the long-running import command itself.
          req.on('close', close);
        },
        lease: autoImportLease,
      });

      if (aborted) {
        return true;
      }

      sendSSE(res, 'success', result);
      sendSSE(res, 'done', {});
      res.end();
    } catch (error) {
      if (aborted) {
        return true;
      }
      sendSSE(res, 'error', toAutoImportErrorEvent(error));
      sendSSE(res, 'done', {});
      res.end();
    } finally {
      autoImportLease.release();
    }
    return true;
  }

  return {
    handleAutoImportRoutes,
  };
}

module.exports = {
  createAutoImportRoutes,
};
