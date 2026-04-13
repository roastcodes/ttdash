function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function ensureBindHostAllowed(bindHost, allowRemoteBind) {
  if (isLoopbackHost(bindHost) || allowRemoteBind) {
    return;
  }

  const error = new Error(
    `Refusing to bind TTDash to non-loopback host "${bindHost}" without TTDASH_ALLOW_REMOTE=1.`,
  );
  error.code = 'REMOTE_BIND_REQUIRES_OPT_IN';
  throw error;
}

function createNoFreePortError(rangeStartPort, maxPort) {
  return new Error(`No free port found (${rangeStartPort}-${maxPort})`);
}

async function listenOnAvailablePort(
  serverInstance,
  port,
  maxPort,
  bindHost,
  log = console.log,
  rangeStartPort = port,
) {
  if (port > maxPort) {
    throw createNoFreePortError(rangeStartPort, maxPort);
  }

  for (let currentPort = port; currentPort <= maxPort; currentPort += 1) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          serverInstance.off('listening', onListening);
          reject(error);
        };

        const onListening = () => {
          serverInstance.off('error', onError);
          resolve();
        };

        serverInstance.once('error', onError);
        serverInstance.once('listening', onListening);
        serverInstance.listen(currentPort, bindHost);
      });

      return currentPort;
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') {
        if (currentPort >= maxPort) {
          throw createNoFreePortError(rangeStartPort, maxPort);
        }
        log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        continue;
      }
      throw error;
    }
  }

  throw createNoFreePortError(rangeStartPort, maxPort);
}

module.exports = {
  createNoFreePortError,
  ensureBindHostAllowed,
  isLoopbackHost,
  listenOnAvailablePort,
};
