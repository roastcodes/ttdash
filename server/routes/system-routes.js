const { getErrorMessage, writeMutationServerError } = require('./http-route-utils');

function formatAttachmentDisposition(filename) {
  const safe = String(filename || 'ttdash-system-export.json')
    .replace(/["\\;]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Creates per-system export, import, listing, and deletion API handlers. */
function createSystemRoutes({
  json,
  sendBuffer,
  validateMutationRequest,
  readMutationBody,
  dataRuntime,
}) {
  const { isPersistedStateError, readData, removeDefaultSystemFilters, systemData } = dataRuntime;

  function writeKnownError(res, error) {
    if (isPersistedStateError(error, 'usage')) {
      json(res, 500, { message: error.message });
      return true;
    }
    if (error?.code === 'LOCAL_SYSTEM_CONFLICT') {
      json(res, 409, { message: error.message, code: error.code });
      return true;
    }
    if (error?.code === 'SYSTEM_EXISTS') {
      json(res, 409, { message: error.message, code: error.code });
      return true;
    }
    return null;
  }

  async function readImportBody(req, res) {
    const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
    if (validationError) {
      json(res, validationError.status, { message: validationError.message });
      return null;
    }
    const bodyResult = await readMutationBody(req, res, {
      tooLargeMessage: 'System export file too large',
      invalidMessage: 'Invalid system export file',
    });
    return bodyResult.ok ? bodyResult.body : null;
  }

  async function handleSystemRoutes(apiPath, req, res) {
    if (apiPath === '/systems') {
      if (req.method === 'GET') {
        try {
          const imported = systemData.readImportedSystems();
          return json(res, 200, {
            localHostname: systemData.localHostname,
            systems: imported.map(({ data, ...metadata }) => ({
              ...metadata,
              days: data.daily.length,
              totalCost: data.totals.totalCost,
            })),
          });
        } catch (error) {
          const handled = writeKnownError(res, error);
          return handled ?? writeMutationServerError(json, res);
        }
      }

      if (req.method === 'DELETE') {
        const validationError = validateMutationRequest(req);
        if (validationError) {
          return json(res, validationError.status, { message: validationError.message });
        }
        try {
          const deleted = await systemData.deleteAllImportedSystems();
          await removeDefaultSystemFilters();
          return json(res, 200, { success: true, deleted });
        } catch {
          return writeMutationServerError(json, res);
        }
      }

      return json(res, 405, { message: 'Method Not Allowed' });
    }

    if (apiPath === '/systems/export') {
      if (req.method !== 'GET') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }
      try {
        const data = readData();
        if (!data?.daily?.length) {
          return json(res, 400, { message: 'No local data available for system export.' });
        }
        const filename = systemData.getSystemFilename(systemData.localHostname);
        const buffer = Buffer.from(JSON.stringify(systemData.createEnvelope(data), null, 2));
        return sendBuffer(
          res,
          200,
          {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': formatAttachmentDisposition(filename),
          },
          buffer,
        );
      } catch (error) {
        const handled = writeKnownError(res, error);
        return handled ?? writeMutationServerError(json, res);
      }
    }

    if (apiPath === '/systems/import/preview') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }
      const body = await readImportBody(req, res);
      if (body === null) return true;
      try {
        return json(res, 200, systemData.previewImport(body));
      } catch (error) {
        const handled = writeKnownError(res, error);
        if (handled !== null) return handled;
        return json(res, 400, { message: getErrorMessage(error, 'Invalid system export file') });
      }
    }

    if (apiPath === '/systems/import') {
      if (req.method !== 'POST') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }
      const body = await readImportBody(req, res);
      if (body === null) return true;
      try {
        const replace = new URL(req.url, 'http://localhost').searchParams.get('replace') === '1';
        return json(res, 200, await systemData.importSystem(body, { replace }));
      } catch (error) {
        const handled = writeKnownError(res, error);
        if (handled !== null) return handled;
        return json(res, 400, { message: getErrorMessage(error, 'Invalid system export file') });
      }
    }

    if (apiPath.startsWith('/systems/')) {
      if (req.method !== 'DELETE') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }
      const validationError = validateMutationRequest(req);
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }
      const hostname = apiPath.slice('/systems/'.length);
      try {
        const deleted = await systemData.deleteImportedSystem(hostname);
        if (deleted) await removeDefaultSystemFilters([hostname.trim().toLowerCase()]);
        return json(res, deleted ? 200 : 404, {
          success: deleted,
          ...(!deleted ? { message: 'System not found.' } : {}),
        });
      } catch (error) {
        return json(res, 400, { message: getErrorMessage(error, 'Invalid system identifier') });
      }
    }

    return false;
  }

  return { handleSystemRoutes };
}

module.exports = { createSystemRoutes };
