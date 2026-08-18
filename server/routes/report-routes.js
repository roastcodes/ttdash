const { formatAttachmentDisposition, getErrorMessage } = require('./http-route-utils');

/** Creates PDF report API route handlers. */
function createReportRoutes({
  json,
  readMutationBody,
  sendBuffer,
  dataRuntime,
  generatePdfReport,
  logger = console,
}) {
  const { isPersistedStateError, readUsageResponse } = dataRuntime;

  async function handleReportRoutes(apiPath, req, res) {
    if (apiPath !== '/report/pdf') {
      return false;
    }

    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const bodyResult = await readMutationBody(req, res, {
      tooLargeMessage: 'Report request too large',
      invalidMessage: 'Invalid report request',
      suppressErrorDetails: true,
    });
    if (!bodyResult.ok) {
      return true;
    }

    const selectedSystems =
      Array.isArray(bodyResult.body?.selectedSystems) && bodyResult.body.selectedSystems.length > 0
        ? bodyResult.body.selectedSystems
        : undefined;
    let data;
    try {
      data = readUsageResponse(selectedSystems);
    } catch (error) {
      if (isPersistedStateError(error, 'usage')) {
        return json(res, 500, { message: error.message });
      }
      logger.error('Unexpected report route usage read error:', error);
      throw new Error('report-routes: unexpected error during usage handling', { cause: error });
    }
    if (!data || !Array.isArray(data.daily) || data.daily.length === 0) {
      return json(res, 400, {
        message: selectedSystems
          ? 'No data available for the selected systems.'
          : 'No data available for the report.',
      });
    }

    try {
      const result = await generatePdfReport(data.daily, bodyResult.body || {});
      return sendBuffer(
        res,
        200,
        {
          'Content-Type': 'application/pdf',
          'Content-Disposition': formatAttachmentDisposition(result.filename, 'ttdash-report.pdf'),
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
