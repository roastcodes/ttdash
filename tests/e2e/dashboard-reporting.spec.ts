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
  await page.getByTestId('language-switcher-de').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  await page.getByRole('button', { name: 'Report' }).click()
  await expect.poll(() => pdfReport.getReportRequest()?.language).toBe('de')

  await page.getByTestId('language-switcher-en').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#filters').getByText('Filter status')).toBeVisible()

  await page.getByRole('button', { name: 'Report' }).click()
  await expect.poll(() => pdfReport.getReportRequest()?.language).toBe('en')
})
