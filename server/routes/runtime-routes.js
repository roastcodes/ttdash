const { getErrorMessage } = require('./http-route-utils');

/** Creates runtime metadata and toktrack version-status API route handlers. */
function createRuntimeRoutes({ json, getRuntimeSnapshot, autoImportRuntime }) {
  const { lookupLatestToktrackVersion } = autoImportRuntime;

  async function handleRuntimeRoutes(apiPath, req, res) {
    if (apiPath === '/runtime') {
      if (req.method !== 'GET') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      try {
        return json(res, 200, getRuntimeSnapshot());
      } catch (error) {
        return json(res, 500, {
          message: 'Internal Server Error',
          detail: getErrorMessage(error, 'Could not retrieve runtime metadata.'),
        });
      }
    }

    if (apiPath === '/toktrack/version-status') {
      if (req.method !== 'GET') {
        return json(res, 405, { message: 'Method Not Allowed' });
      }

      try {
        return json(res, 200, await lookupLatestToktrackVersion());
      } catch (error) {
        return json(res, 503, {
          message: 'Service Unavailable',
          detail: getErrorMessage(error, 'Could not determine the latest toktrack version.'),
        });
      }
    }

    return false;
  }

  return {
    handleRuntimeRoutes,
  };
}

module.exports = {
  createRuntimeRoutes,
};
