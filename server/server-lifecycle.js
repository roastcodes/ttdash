function createClientErrorResponse() {
  return (
    'HTTP/1.1 400 Bad Request\r\n' +
    'Content-Type: application/json; charset=utf-8\r\n' +
    'Connection: close\r\n' +
    '\r\n' +
    JSON.stringify({ message: 'Invalid request path' })
  );
}

function createServerLifecycle({
  http,
  processObject = process,
  createServer = http.createServer,
  router,
  httpUtils,
  listenOnAvailablePort,
  ensureBindHostAllowed,
  dataRuntime,
  backgroundRuntime,
  startupRuntime,
  serverAuth,
  runtimeState,
  startPort,
  maxPort,
  bindHost,
  allowRemoteBind,
  cliOptions,
  isBackgroundChild,
  log = console.log,
  errorLog = console.error,
}) {
  const server = createServer((req, res) => {
    void router.handleServerRequest(req, res).catch((error) => {
      errorLog(error);
      if (res.headersSent) {
        res.end();
        return;
      }
      httpUtils.json(res, 500, { message: 'Internal Server Error' });
    });
  });

  server.on('clientError', (error, socket) => {
    errorLog(error);
    if (!socket.writable) {
      return;
    }
    socket.end(createClientErrorResponse());
  });

  function tryListen(port) {
    return listenOnAvailablePort(server, port, maxPort, bindHost, log, startPort);
  }

  function ensureServerSecurityAllowed() {
    ensureBindHostAllowed(bindHost, allowRemoteBind);
    serverAuth.ensureConfigured();
  }

  async function start() {
    ensureServerSecurityAllowed();
    dataRuntime.ensureAppDirs([backgroundRuntime.paths.backgroundLogDir]);
    dataRuntime.migrateLegacyDataFile();

    const port = await tryListen(startPort);
    const browserHost = bindHost === '0.0.0.0' ? 'localhost' : bindHost;
    const url = `http://${browserHost}:${port}`;
    runtimeState.setListening({ port, url });
    startupRuntime.writeLocalAuthSessionFile(url, runtimeState.getRuntimeInstance());

    if (isBackgroundChild) {
      await backgroundRuntime.registerBackgroundInstance(
        backgroundRuntime.createBackgroundInstance({
          port,
          url,
          bootstrapUrl: serverAuth.createBootstrapUrl(url),
        }),
      );
    }

    if (cliOptions.autoLoad) {
      await startupRuntime.runStartupAutoLoad({
        source: 'cli-auto-load',
      });
    }

    startupRuntime.printStartupSummary(url, port);
    startupRuntime.openBrowser(serverAuth.createBootstrapUrl(url));
  }

  async function runCli() {
    if (cliOptions.command === 'stop') {
      await backgroundRuntime.runStopCommand();
      return;
    }

    if (cliOptions.background && !isBackgroundChild) {
      ensureServerSecurityAllowed();
      await backgroundRuntime.startInBackground();
      return;
    }

    await start();
  }

  async function unregisterBackgroundInstance() {
    if (isBackgroundChild) {
      await backgroundRuntime.unregisterBackgroundInstance(processObject.pid);
    }
  }

  let shutdownCompleted = false;
  function completeShutdown(message) {
    if (shutdownCompleted) {
      return;
    }

    shutdownCompleted = true;
    Promise.resolve()
      .then(unregisterBackgroundInstance)
      .catch((error) => {
        errorLog(error);
      })
      .finally(() => {
        log(message);
        processObject.exit(0);
      });
  }

  function shutdown(signal) {
    log(`\n${signal} received, shutting down server...`);
    server.close(() => {
      completeShutdown('Server stopped.');
    });

    setTimeout(() => {
      completeShutdown('Forcing shutdown.');
    }, 3000);
  }

  function registerShutdownHandlers() {
    processObject.on('SIGINT', () => {
      shutdown('SIGINT');
    });
    processObject.on('SIGTERM', () => {
      shutdown('SIGTERM');
    });
  }

  function bootstrapCli() {
    runCli().catch((error) => {
      Promise.resolve()
        .then(unregisterBackgroundInstance)
        .finally(() => {
          errorLog(error);
          processObject.exit(1);
        });
    });

    registerShutdownHandlers();
  }

  return {
    bootstrapCli,
    runCli,
    server,
    shutdown,
    start,
  };
}

module.exports = {
  createClientErrorResponse,
  createServerLifecycle,
};
