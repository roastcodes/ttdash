const { getErrorMessage, writeMutationServerError } = require('./http-route-utils');

const EMPTY_USAGE_RESPONSE = {
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
};

const REQUIRED_USAGE_TOTAL_KEYS = Object.keys(EMPTY_USAGE_RESPONSE.totals);

/** Creates usage, upload, and usage-import API route handlers. */
function createUsageRoutes({ json, validateMutationRequest, readMutationBody, dataRuntime }) {
  const {
    extractUsageImportPayload,
    isPersistedStateError,
    mergeUsageData,
    readData,
    unlinkIfExists,
    _updateDataLoadStateUnlocked,
    withSettingsAndDataMutationLock,
    writeData,
    paths: { dataFile },
  } = dataRuntime;

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function hasNumericUsageTotals(totals) {
    return (
      isPlainObject(totals) &&
      REQUIRED_USAGE_TOTAL_KEYS.every((key) => Number.isFinite(totals[key]))
    );
  }

  function isUsageData(value) {
    return (
      isPlainObject(value) &&
      Array.isArray(value.daily) &&
      value.daily.every((day) => isPlainObject(day) && typeof day.date === 'string') &&
      hasNumericUsageTotals(value.totals)
    );
  }

  function normalizeIncomingUsagePayload(payload, invalidMessage) {
    let nextPayload = payload;

    if (typeof dataRuntime.normalizeIncomingData === 'function') {
      const normalized = dataRuntime.normalizeIncomingData(payload);
      // normalizeIncomingData may return undefined to keep the original payload; null is invalid.
      if (normalized !== undefined) {
        nextPayload = normalized;
      }
    }

    if (!isUsageData(nextPayload)) {
      throw new Error(invalidMessage);
    }

    return nextPayload;
  }

  function writeJsonResponse(res, status, payload) {
    json(res, status, payload);
    return true;
  }

  function writeServerError(res) {
    writeMutationServerError(json, res);
    return true;
  }

  async function handleUsageRoutes(apiPath, req, res) {
    // Route handlers return true when they handled a request and false when unmatched.
    if (apiPath === '/usage') {
      if (req.method === 'GET') {
        let data;
        try {
          data = readData();
        } catch (error) {
          if (isPersistedStateError(error, 'usage')) {
            return writeJsonResponse(res, 500, { message: error.message });
          }
          throw error;
        }
        return writeJsonResponse(res, 200, data || EMPTY_USAGE_RESPONSE);
      }
      if (req.method === 'DELETE') {
        const validationError = validateMutationRequest(req);
        if (validationError) {
          return writeJsonResponse(res, validationError.status, {
            message: validationError.message,
          });
        }
        try {
          await withSettingsAndDataMutationLock(async () => {
            await unlinkIfExists(dataFile);
            await _updateDataLoadStateUnlocked({
              lastLoadedAt: null,
              lastLoadSource: null,
            });
          });
        } catch (error) {
          if (isPersistedStateError(error, 'usage') || isPersistedStateError(error, 'settings')) {
            return writeJsonResponse(res, 500, { message: error.message });
          }
          return writeServerError(res);
        }
        return writeJsonResponse(res, 200, { success: true });
      }
      return writeJsonResponse(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/upload') {
      if (req.method === 'POST') {
        const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
        if (validationError) {
          return writeJsonResponse(res, validationError.status, {
            message: validationError.message,
          });
        }

        const bodyResult = await readMutationBody(req, res, {
          tooLargeMessage: 'File too large (max. 10 MB)',
          invalidMessage: 'Invalid JSON',
        });
        if (!bodyResult.ok) {
          // readMutationBody has already written the error response; true means handled.
          return true;
        }

        let nextData;
        try {
          nextData = normalizeIncomingUsagePayload(bodyResult.body, 'Invalid JSON');
        } catch (error) {
          return writeJsonResponse(res, 400, { message: getErrorMessage(error, 'Invalid JSON') });
        }

        try {
          await withSettingsAndDataMutationLock(async () => {
            await writeData(nextData);
            await _updateDataLoadStateUnlocked({
              lastLoadedAt: new Date().toISOString(),
              lastLoadSource: 'file',
            });
          });
          return writeJsonResponse(res, 200, {
            days: nextData.daily.length,
            totalCost: nextData.totals.totalCost,
          });
        } catch (error) {
          if (isPersistedStateError(error, 'settings') || isPersistedStateError(error, 'usage')) {
            return writeJsonResponse(res, 500, { message: error.message });
          }
          return writeServerError(res);
        }
      }
      return writeJsonResponse(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/usage/import') {
      if (req.method !== 'POST') {
        return writeJsonResponse(res, 405, { message: 'Method Not Allowed' });
      }

      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return writeJsonResponse(res, validationError.status, {
          message: validationError.message,
        });
      }

      const bodyResult = await readMutationBody(req, res, {
        tooLargeMessage: 'Usage backup file too large',
        invalidMessage: 'Invalid usage backup file',
      });
      if (!bodyResult.ok) {
        // readMutationBody has already written the error response; true means handled.
        return true;
      }

      let importedData;
      try {
        const usagePayload = extractUsageImportPayload(bodyResult.body);
        importedData = normalizeIncomingUsagePayload(usagePayload, 'Invalid usage backup file');
      } catch (error) {
        return writeJsonResponse(res, 400, {
          message: getErrorMessage(error, 'Invalid usage backup file'),
        });
      }

      try {
        const result = await withSettingsAndDataMutationLock(async () => {
          const currentData = readData();
          const merged = mergeUsageData(currentData, importedData);
          await writeData(merged.data);
          await _updateDataLoadStateUnlocked({
            lastLoadedAt: new Date().toISOString(),
            lastLoadSource: 'file',
          });
          return merged;
        });
        return writeJsonResponse(res, 200, result.summary);
      } catch (error) {
        if (isPersistedStateError(error, 'usage') || isPersistedStateError(error, 'settings')) {
          return writeJsonResponse(res, 500, { message: error.message });
        }
        return writeServerError(res);
      }
    }

    return false;
  }

  return {
    handleUsageRoutes,
  };
}

module.exports = {
  createUsageRoutes,
};
