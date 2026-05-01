const { createAutoImportRoutes } = require('./routes/auto-import-routes');
const { createReportRoutes } = require('./routes/report-routes');
const { createRuntimeRoutes } = require('./routes/runtime-routes');
const { createSettingsRoutes } = require('./routes/settings-routes');
const { createStaticRouteHandler } = require('./routes/static-routes');
const { createUsageRoutes } = require('./routes/usage-routes');
const { readMutationBody, sendSSE } = require('./routes/http-route-utils');

/** Creates the HTTP router that validates requests and dispatches route groups. */
function createHttpRouter({
  fs,
  path,
  staticRoot,
  securityHeaders,
  prepareHtmlResponse = (html) => ({ body: html, headers: securityHeaders }),
  httpUtils,
  remoteAuth,
  dataRuntime,
  autoImportRuntime,
  generatePdfReport,
  getRuntimeSnapshot,
}) {
  const {
    json,
    readBody,
    resolveApiPath,
    sendBuffer,
    validateMutationRequest,
    validateRequestHost,
  } = httpUtils;
  const routeReadMutationBody = (req, res, messages) =>
    readMutationBody(req, res, {
      readBody,
      json,
      isPayloadTooLargeError: dataRuntime.isPayloadTooLargeError,
      ...messages,
    });
  const usageRoutes = createUsageRoutes({
    json,
    validateMutationRequest,
    readMutationBody: routeReadMutationBody,
    dataRuntime,
  });
  const settingsRoutes = createSettingsRoutes({
    json,
    validateMutationRequest,
    readMutationBody: routeReadMutationBody,
    dataRuntime,
  });
  const autoImportRoutes = createAutoImportRoutes({
    json,
    validateMutationRequest,
    securityHeaders,
    autoImportRuntime,
    sendSSE,
  });
  const runtimeRoutes = createRuntimeRoutes({
    json,
    getRuntimeSnapshot,
    autoImportRuntime,
  });
  const reportRoutes = createReportRoutes({
    json,
    readMutationBody: routeReadMutationBody,
    sendBuffer,
    dataRuntime,
    generatePdfReport,
  });
  const staticRoutes = createStaticRouteHandler({
    fs,
    path,
    staticRoot,
    securityHeaders,
    prepareHtmlResponse,
    json,
  });
  const apiRouteHandlers = [
    usageRoutes.handleUsageRoutes,
    settingsRoutes.handleSettingsRoutes,
    autoImportRoutes.handleAutoImportRoutes,
    runtimeRoutes.handleRuntimeRoutes,
    reportRoutes.handleReportRoutes,
  ];

  async function dispatchApiRoute(apiPath, req, res) {
    for (const handleApiRoute of apiRouteHandlers) {
      const routeResult = await handleApiRoute(apiPath, req, res);
      if (routeResult !== false) {
        return true;
      }
    }

    return false;
  }

  async function handleServerRequest(req, res) {
    let url;
    let pathname;

    try {
      url = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return json(res, 400, { message: 'Invalid request path' });
    }

    const hostValidationError = validateRequestHost(req);
    if (hostValidationError) {
      return json(res, hostValidationError.status, { message: hostValidationError.message });
    }

    const apiPath = resolveApiPath(pathname);

    if (apiPath !== null) {
      const authError = remoteAuth?.validateApiRequest(req);
      if (authError) {
        return json(res, authError.status, { message: authError.message }, authError.headers);
      }
    }

    if (apiPath === null && (pathname === '/api' || pathname.startsWith('/api/'))) {
      return json(res, 404, { message: 'Not Found' });
    }

    if (apiPath !== null) {
      const handled = await dispatchApiRoute(apiPath, req, res);
      if (handled) {
        return;
      }

      return json(res, 404, { message: 'API endpoint not found' });
    }

    const bootstrapResponse = remoteAuth?.resolveBootstrapResponse(url);
    if (bootstrapResponse) {
      res.writeHead(bootstrapResponse.status, {
        ...securityHeaders,
        ...bootstrapResponse.headers,
      });
      res.end(bootstrapResponse.body);
      return;
    }

    await staticRoutes.handleStaticRequest(req, res, pathname);
  }

  return {
    handleServerRequest,
  };
}

module.exports = {
  createHttpRouter,
};
