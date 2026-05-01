const { getErrorMessage } = require('./http-route-utils');

function formatReportContentDisposition(filename) {
  const rawFilename = String(filename || 'ttdash-report.pdf');
  const asciiFallback = rawFilename
    .replace(/["\\;]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim();
  const safeAsciiFilename = asciiFallback || 'ttdash-report.pdf';
  const encodedFilename = encodeURIComponent(rawFilename);

  return `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

/** Creates PDF report API route handlers. */
function createReportRoutes({
  json,
  readMutationBody,
  sendBuffer,
  dataRuntime,
  generatePdfReport,
}) {
  const { isPersistedStateError, readData } = dataRuntime;

  async function handleReportRoutes(apiPath, req, res) {
    if (apiPath !== '/report/pdf') {
      return false;
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    let data;
    try {
      data = readData();
    } catch (error) {
      if (isPersistedStateError(error, 'usage')) {
        return json(res, 500, { message: error.message });
      }
      console.error('Unexpected report route usage read error:', error);
      throw new Error('report-routes: unexpected error during usage handling', { cause: error });
    }
    if (!data || !Array.isArray(data.daily) || data.daily.length === 0) {
      return json(res, 400, { message: 'No data available for the report.' });
    }

    const bodyResult = await readMutationBody(req, res, {
      tooLargeMessage: 'Report request too large',
      invalidMessage: 'Invalid report request',
      suppressErrorDetails: true,
    });
    if (!bodyResult.ok) {
      return true;
    }

    try {
      const result = await generatePdfReport(data.daily, bodyResult.body || {});
      return sendBuffer(
        res,
        200,
        {
          'Content-Type': 'application/pdf',
          'Content-Disposition': formatReportContentDisposition(result.filename),
        },
        result.buffer,
      );
    } catch (error) {
      const message = getErrorMessage(error, 'PDF generation failed');
      const status = error && error.code === 'TYPST_MISSING' ? 503 : 500;
      return json(res, status, { message });
    }
  }

  return {
    handleReportRoutes,
  };
}

module.exports = {
  createReportRoutes,
};
