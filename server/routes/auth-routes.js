/** Creates the remote browser-session route without weakening API bearer authentication. */
function createAuthRoutes({ json, securityHeaders, validateMutationRequest, serverAuth }) {
  function handleAuthRoutes(apiPath, req, res) {
    if (apiPath !== '/auth/session') {
      return false;
    }

    if (req.method !== 'POST') {
      json(res, 405, { message: 'Method not allowed' }, { Allow: 'POST' });
      return true;
    }

    const validationError = validateMutationRequest(req);
    if (validationError) {
      json(res, validationError.status, { message: validationError.message });
      return true;
    }

    const response = serverAuth?.createRemoteSessionResponse(req);
    if (!response) {
      json(res, 404, { message: 'Not Found' });
      return true;
    }

    if (response.status !== 204) {
      json(res, response.status, { message: response.message }, response.headers);
      return true;
    }

    res.writeHead(response.status, {
      ...securityHeaders,
      ...response.headers,
    });
    res.end(response.body);
    return true;
  }

  return { handleAuthRoutes };
}

module.exports = { createAuthRoutes };
