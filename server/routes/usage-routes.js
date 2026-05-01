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

  function normalizeIncomingUsagePayload(payload, invalidMessage) {
    if (typeof dataRuntime.normalizeIncomingData !== 'function') {
      return payload;
    }

    const normalized = dataRuntime.normalizeIncomingData(payload);
    // normalizeIncomingData may return undefined to keep the original payload; null is invalid.
    if (normalized === undefined) {
      return payload;
    }
    if (normalized === null) {
      throw new Error(invalidMessage);
    }
    return normalized;
  }

  async function handleUsageRoutes(apiPath, req, res) {
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
        return json(res, 200, data || EMPTY_USAGE_RESPONSE);
      }
      if (req.method === 'DELETE') {
        const validationError = validateMutationRequest(req);
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
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
            return json(res, 500, { message: error.message });
          }
          return writeMutationServerError(json, res);
        }
        return json(res, 200, { success: true });
      }
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/upload') {
      if (req.method === 'POST') {
        const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }

        const bodyResult = await readMutationBody(req, res, {
          tooLargeMessage: 'File too large (max. 10 MB)',
          invalidMessage: 'Invalid JSON',
        });
        if (!bodyResult.ok) {
          return true;
        }

        let nextData;
        try {
          nextData = normalizeIncomingUsagePayload(bodyResult.body, 'Invalid JSON');
        } catch (error) {
          return json(res, 400, { message: getErrorMessage(error, 'Invalid JSON') });
        }

        try {
          await withSettingsAndDataMutationLock(async () => {
            await writeData(nextData);
            await _updateDataLoadStateUnlocked({
              lastLoadedAt: new Date().toISOString(),
              lastLoadSource: 'file',
            });
          });
          return json(res, 200, {
            days: nextData.daily.length,
            totalCost: nextData.totals.totalCost,
          });
        } catch (error) {
          if (isPersistedStateError(error, 'settings') || isPersistedStateError(error, 'usage')) {
            return json(res, 500, { message: error.message });
          }
          return writeMutationServerError(json, res);
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

      const bodyResult = await readMutationBody(req, res, {
        tooLargeMessage: 'Usage backup file too large',
        invalidMessage: 'Invalid usage backup file',
      });
      if (!bodyResult.ok) {
        return true;
      }

      let importedData;
      try {
        const usagePayload = extractUsageImportPayload(bodyResult.body);
        importedData = normalizeIncomingUsagePayload(usagePayload, 'Invalid usage backup file');
      } catch (error) {
        return json(res, 400, { message: getErrorMessage(error, 'Invalid usage backup file') });
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
        return json(res, 200, result.summary);
      } catch (error) {
        if (isPersistedStateError(error, 'usage') || isPersistedStateError(error, 'settings')) {
          return json(res, 500, { message: error.message });
        }
        return writeMutationServerError(json, res);
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
