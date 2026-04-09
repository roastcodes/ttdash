import path from 'node:path'
import { expect, test } from '@playwright/test'

const sampleUsagePath = path.join(process.cwd(), 'examples', 'sample-usage.json')

test('uploads sample usage data and renders the dashboard without browser errors', async ({ page }) => {
  const pageErrors: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') {
      pageErrors.push(message.text())
    }
  })

  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  await page.request.delete('/api/usage')

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'TTDash' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Auto-Import' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Datei hochladen' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles(sampleUsagePath)

  await expect(page.getByRole('button', { name: 'Import' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible()
  await expect(page.getByText(/^Datei sample-usage\.json erfolgreich geladen$/)).toBeVisible()
  await expect(page.locator('#token-analysis')).toBeVisible()

  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})
