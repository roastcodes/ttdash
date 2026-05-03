const { getErrorMessage, writeMutationServerError } = require('./http-route-utils');

/** Creates settings and settings-import API route handlers. */
function createSettingsRoutes({ json, validateMutationRequest, readMutationBody, dataRuntime }) {
  const {
    extractSettingsImportPayload,
    isPersistedStateError,
    readSettings,
    unlinkIfExists,
    updateSettings,
    withFileMutationLock,
    writeSettings,
    normalizeSettings,
    paths: { settingsFile },
  } = dataRuntime;

  async function handleSettingsRoutes(apiPath, req, res) {
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
        try {
          const settings = await withFileMutationLock(settingsFile, async () => {
            await unlinkIfExists(settingsFile);
            return readSettings();
          });
          return json(res, 200, { success: true, settings });
        } catch (error) {
          if (isPersistedStateError(error, 'settings')) {
            return json(res, 500, { message: error.message });
          }
          return writeMutationServerError(json, res);
        }
      }

      if (req.method === 'PATCH') {
        const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }

        const bodyResult = await readMutationBody(req, res, {
          tooLargeMessage: 'Settings request too large',
          invalidMessage: 'Invalid settings request',
        });
        if (!bodyResult.ok) {
          return true;
        }

        try {
          return json(res, 200, await updateSettings(bodyResult.body));
        } catch (error) {
          if (isPersistedStateError(error, 'settings')) {
            return json(res, 500, { message: error.message });
          }
          return writeMutationServerError(json, res);
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

      const bodyResult = await readMutationBody(req, res, {
        tooLargeMessage: 'Settings file too large',
        invalidMessage: 'Invalid settings file',
      });
      if (!bodyResult.ok) {
        return true;
      }

      let importedSettings;
      try {
        importedSettings = normalizeSettings(extractSettingsImportPayload(bodyResult.body));
      } catch (error) {
        return json(res, 400, { message: getErrorMessage(error, 'Invalid settings file') });
      }

      try {
        const settings = await withFileMutationLock(settingsFile, async () => {
          await writeSettings(importedSettings);
          return readSettings();
        });
        return json(res, 200, settings);
      } catch (error) {
        if (isPersistedStateError(error, 'settings')) {
          return json(res, 500, { message: error.message });
        }
        return writeMutationServerError(json, res);
      }
    }

    return false;
  }

  return {
    handleSettingsRoutes,
  };
}

module.exports = {
  createSettingsRoutes,
};
