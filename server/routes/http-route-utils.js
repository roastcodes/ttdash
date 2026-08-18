const { formatErrorMessage } = require('../runtime-formatters');

/** Returns a stable fallback message for unknown thrown values. */
function getErrorMessage(error, fallback) {
  return formatErrorMessage(error, fallback);
}

/** Builds a safe Content-Disposition attachment header with UTF-8 filename support. */
function formatAttachmentDisposition(filename, defaultFilename) {
  const fallback = String(defaultFilename || 'ttdash-download');
  const rawFilename = String(filename || fallback);
  const asciiFallback = rawFilename
    .replace(/["\\;]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim();
  const safeAsciiFilename = asciiFallback || fallback;
  const encodedFilename = encodeURIComponent(rawFilename).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

function getSSEErrorLog(logger) {
  return logger && typeof logger.error === 'function' ? logger.error.bind(logger) : console.error;
}

const SAFE_SSE_EVENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const fallbackSSEEventName = 'invalid_event';

function getSafeSSEEventName(event, logger) {
  const eventName = String(event);

  if (SAFE_SSE_EVENT_PATTERN.test(eventName)) {
    return eventName;
  }

  getSSEErrorLog(logger)(
    `Invalid SSE event name "${eventName}". Falling back to "${fallbackSSEEventName}".`,
  );
  return fallbackSSEEventName;
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
  const safeEventName = getSafeSSEEventName(event, logger);
  let payload;
  try {
    payload = JSON.stringify(data);
  } catch (error) {
    getSSEErrorLog(logger)(`Failed to serialize SSE payload for event "${safeEventName}":`, error);
    payload = JSON.stringify({ message: 'Serialization error', event: safeEventName });
  }
  res.write(`event: ${safeEventName}\ndata: ${payload}\n\n`);
}

module.exports = {
  formatAttachmentDisposition,
  getErrorMessage,
  readMutationBody,
  sendSSE,
  writeMutationServerError,
};
