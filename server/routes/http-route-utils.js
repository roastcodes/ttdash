const { formatErrorMessage } = require('../runtime-formatters');

/** Returns a stable fallback message for unknown thrown values. */
function getErrorMessage(error, fallback) {
  return formatErrorMessage(error, fallback);
}

function getSSEErrorLog(logger) {
  return logger && typeof logger.error === 'function' ? logger.error.bind(logger) : console.error;
}

/** Reads a mutation body and writes the matching client error response on parse/size failures. */
async function readMutationBody(
  req,
  res,
  {
    readBody,
    json,
    isPayloadTooLargeError,
    tooLargeMessage,
    invalidMessage,
    suppressErrorDetails = false,
  },
) {
  try {
    return { ok: true, body: await readBody(req) };
  } catch (error) {
    if (isPayloadTooLargeError(error)) {
      json(res, 413, { message: tooLargeMessage });
      return { ok: false };
    }
    json(res, 400, {
      message: suppressErrorDetails ? invalidMessage : getErrorMessage(error, invalidMessage),
    });
    return { ok: false };
  }
}

/** Writes the generic mutation error response used by persistence-backed routes. */
function writeMutationServerError(json, res) {
  return json(res, 500, { message: 'Server error' });
}

/** Writes one Server-Sent Event frame. */
function sendSSE(res, event, data, logger = console) {
  let payload;
  try {
    payload = JSON.stringify(data);
  } catch (error) {
    getSSEErrorLog(logger)(`Failed to serialize SSE payload for event "${event}":`, error);
    payload = JSON.stringify({ message: 'Serialization error', event });
  }
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

module.exports = {
  getErrorMessage,
  readMutationBody,
  sendSSE,
  writeMutationServerError,
};
