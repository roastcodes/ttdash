function createServerRuntimeState({ id, pid, startedAt, mode }) {
  const runtimeInstance = {
    id,
    pid,
    startedAt,
    mode,
  };
  const listeningState = {
    port: null,
    url: null,
  };
  let startupAutoLoadCompleted = false;

  function getRuntimeInstance() {
    return { ...runtimeInstance };
  }

  function getSnapshot() {
    return {
      id: runtimeInstance.id,
      mode: runtimeInstance.mode,
      port: listeningState.port,
      url: listeningState.url,
    };
  }

  function setListening({ port, url }) {
    listeningState.port = port;
    listeningState.url = url;
  }

  function isStartupAutoLoadCompleted() {
    return startupAutoLoadCompleted;
  }

  function markStartupAutoLoadCompleted() {
    startupAutoLoadCompleted = true;
  }

  return {
    getRuntimeInstance,
    getSnapshot,
    isStartupAutoLoadCompleted,
    markStartupAutoLoadCompleted,
    setListening,
  };
}

function createExclusiveRuntimeLease({ createAlreadyRunningError }) {
  let active = false;

  function acquire() {
    if (active) {
      throw createAlreadyRunningError();
    }

    active = true;
    let released = false;

    return {
      release() {
        if (released) {
          return;
        }
        released = true;
        active = false;
      },
    };
  }

  function isActive() {
    return active;
  }

  return {
    acquire,
    isActive,
  };
}

function createExpiringAsyncCache({ load, getTtlMs, now = () => Date.now() }) {
  let cachedEntry = null;
  let inFlightLookup = null;

  async function lookup(...args) {
    const currentTime = now();
    if (cachedEntry && currentTime < cachedEntry.expiresAt) {
      return cachedEntry.value;
    }

    if (inFlightLookup) {
      return inFlightLookup;
    }

    inFlightLookup = (async () => {
      try {
        const value = await load(...args);
        cachedEntry = {
          value,
          expiresAt: now() + getTtlMs(value),
        };
        return value;
      } finally {
        inFlightLookup = null;
      }
    })();

    return inFlightLookup;
  }

  function reset() {
    cachedEntry = null;
    inFlightLookup = null;
  }

  return {
    lookup,
    reset,
  };
}

module.exports = {
  createExclusiveRuntimeLease,
  createExpiringAsyncCache,
  createServerRuntimeState,
};
