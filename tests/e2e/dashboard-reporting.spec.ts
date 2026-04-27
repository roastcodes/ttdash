import { expect, test } from '@playwright/test'
import { gotoDashboard, mockPdfReport, resetAppState, uploadSampleUsage } from './helpers'

test('uses the current UI language when generating a PDF report after switching locale', async ({
  page,
  baseURL,
}) => {
  await resetAppState(page, baseURL)

  const pdfReport = await mockPdfReport(page)

  await gotoDashboard(page)
  await uploadSampleUsage(page)
  await page.getByTitle(/English|Englisch/).click()
  await expect(page.locator('#filters').getByText('Filter status')).toBeVisible()

  await page.getByRole('button', { name: 'Report' }).click()

  await expect.poll(() => pdfReport.getReportRequest()?.language).toBe('en')
})
