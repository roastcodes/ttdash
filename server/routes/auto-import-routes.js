/** Creates the auto-import streaming API route handler. */
function createAutoImportRoutes({
  json,
  validateMutationRequest,
  securityHeaders,
  autoImportRuntime,
  sendSSE,
  logger = console,
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
    const writeSSE = (event, data) => sendSSE(res, event, data, logger);
    const endResponse = () => {
      if (!res.writableEnded) {
        res.end();
      }
    };
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
            writeSSE('check', event);
          }
        },
        onProgress: (event) => {
          if (!aborted) {
            writeSSE('progress', event);
          }
        },
        onOutput: (line) => {
          if (!aborted) {
            writeSSE('stderr', { line });
          }
        },
        signalOnClose: (close) => {
          // This second close listener aborts the long-running import command itself.
          req.on('close', close);
        },
        lease: autoImportLease,
      });

      if (aborted) {
        endResponse();
        return true;
      }

      writeSSE('success', result);
      writeSSE('done', {});
      endResponse();
    } catch (error) {
      if (aborted) {
        endResponse();
        return true;
      }
      writeSSE('error', toAutoImportErrorEvent(error));
      writeSSE('done', {});
      endResponse();
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
