function createAutoImportMessageEvent(key, vars = {}) {
  return {
    key,
    vars,
  };
}

function createAutoImportError(message, key, vars = {}) {
  const error = new Error(message);
  error.messageKey = key;
  error.messageVars = vars;
  return error;
}

function summarizeCommandError(error, fallbackMessage = 'Unknown error') {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
}

function getTimeoutSeconds(timeoutMs) {
  return Math.max(1, Math.ceil(Number(timeoutMs) / 1000));
}

function createAutoImportMessages({ toktrackVersion }) {
  function toAutoImportErrorEvent(error) {
    if (error && typeof error.messageKey === 'string') {
      return createAutoImportMessageEvent(error.messageKey, error.messageVars || {});
    }

    return createAutoImportMessageEvent('errorPrefix', {
      message: error && error.message ? error.message : 'Unknown error',
    });
  }

  function formatAutoImportMessageEvent(event) {
    switch (event?.key) {
      case 'startingLocalImport':
        return 'Starting toktrack import...';
      case 'warmingUpPackageRunner':
        return `Preparing ${event.vars?.runner || 'package runner'} (the first run may take longer while toktrack is downloaded)...`;
      case 'loadingUsageData':
        return `Loading usage data via ${event.vars?.command || 'unknown command'}...`;
      case 'processingUsageData':
        return `Processing usage data... (${event.vars?.seconds || 0}s)`;
      case 'autoImportRunning':
        return 'An auto-import is already running. Please wait.';
      case 'noRunnerFound':
        return 'No local toktrack, Bun, or npm exec installation found.';
      case 'localToktrackVersionMismatch':
        return `Local toktrack v${event.vars?.detectedVersion || 'unknown'} does not match the required v${event.vars?.expectedVersion || toktrackVersion}.`;
      case 'localToktrackFailed':
        return `Local toktrack could not be started: ${event.vars?.message || 'Unknown error'}`;
      case 'packageRunnerFailed':
        return `No compatible bunx or npm exec runner succeeded: ${event.vars?.message || 'Unknown error'}`;
      case 'packageRunnerWarmupTimedOut':
        return `${event.vars?.runner || 'The package runner'} took longer than ${event.vars?.seconds || 0}s to prepare toktrack. The first run may need to download the package first. Please try again or verify network access.`;
      case 'toktrackVersionCheckFailed':
        return `Toktrack was found, but the version check failed: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackExecutionFailed':
        return `Toktrack failed while loading usage data: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackExecutionTimedOut':
        return `Toktrack did not finish loading usage data within ${event.vars?.seconds || 0}s via ${event.vars?.runner || 'the selected runner'}. Please try again.`;
      case 'toktrackInvalidJson':
        return `Toktrack returned invalid JSON output: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackInvalidData':
        return `Toktrack returned data that TTDash could not process: ${event.vars?.message || 'Unknown error'}`;
      case 'errorPrefix':
        return `Error: ${event.vars?.message || 'Unknown error'}`;
      default:
        return 'Auto-import update';
    }
  }

  return {
    createAutoImportError,
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    getTimeoutSeconds,
    summarizeCommandError,
    toAutoImportErrorEvent,
  };
}

module.exports = {
  createAutoImportError,
  createAutoImportMessageEvent,
  createAutoImportMessages,
  getTimeoutSeconds,
  summarizeCommandError,
};
