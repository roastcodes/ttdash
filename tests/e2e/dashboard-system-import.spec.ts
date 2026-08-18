import fsPromises from 'node:fs/promises'
import { expect, test } from './fixtures'
import {
  createApiAuthHeaders,
  createApiUrl,
  gotoDashboard,
  resetAppState,
  sampleUsage,
  uploadSampleUsage,
} from './helpers'

const maintenanceTabPattern = /Wartung|Maintenance/
const importSystemsPattern = /^(Systemdateien importieren|Import system files)$/
const replaceAllPattern = /^(Alle ersetzen|Replace all)$/
const deletePattern = /^(Löschen|Delete)$/
const settingsPattern = /^(Einstellungen|Settings)$/

function createSystemExport(hostname: string, totalCost?: number) {
  const data = structuredClone(sampleUsage)
  if (totalCost !== undefined) {
    data.daily = [
      {
        ...data.daily[0],
        totalCost,
      },
    ]
  }

  return {
    kind: 'ttdash-system-export',
    version: 1,
    exportedAt: '2026-08-18T08:00:00.000Z',
    appVersion: '6.4.0-test',
    hostname,
    data,
  }
}

test('imports multiple systems, filters one system, replaces a conflict, and deletes it', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(60_000)
  await resetAppState(page, baseURL)
  await gotoDashboard(page)
  await uploadSampleUsage(page)

  const workstationBPath = testInfo.outputPath('ttdash-system-workstation-b.json')
  const workstationCPath = testInfo.outputPath('ttdash-system-workstation-c.json')
  await Promise.all([
    fsPromises.writeFile(
      workstationBPath,
      JSON.stringify(createSystemExport('workstation-b'), null, 2),
    ),
    fsPromises.writeFile(
      workstationCPath,
      JSON.stringify(createSystemExport('workstation-c'), null, 2),
    ),
  ])

  await page.getByRole('button', { name: settingsPattern }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: maintenanceTabPattern }).click()
  await expect(dialog.getByRole('button', { name: importSystemsPattern })).toBeVisible()
  await page.getByTestId('system-import-input').setInputFiles([workstationBPath, workstationCPath])

  await expect(dialog.getByText('workstation-b', { exact: true })).toBeVisible()
  await expect(dialog.getByText('workstation-c', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const systemFilter = page.getByTestId('system-filter')
  await expect(systemFilter).toBeVisible()
  await expect(systemFilter.getByRole('button')).toHaveCount(3)
  await systemFilter.getByRole('button', { name: 'workstation-b' }).click()
  await expect(systemFilter.getByRole('button', { name: 'workstation-b' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('#metrics').getByText('$19.9', { exact: true }).first()).toBeVisible()

  await fsPromises.writeFile(
    workstationBPath,
    JSON.stringify(createSystemExport('workstation-b', 42), null, 2),
  )
  await page.getByRole('button', { name: settingsPattern }).click()
  await dialog.getByRole('tab', { name: maintenanceTabPattern }).click()
  await page.getByTestId('system-import-input').setInputFiles(workstationBPath)
  await expect(dialog.getByRole('alertdialog')).toContainText('workstation-b')
  await dialog.getByRole('button', { name: replaceAllPattern }).click()

  await expect
    .poll(async () => {
      const response = await page.request.get(createApiUrl('/api/usage', baseURL), {
        headers: createApiAuthHeaders(),
      })
      const usage = await response.json()
      return usage.systems.find(
        (system: { hostname: string }) => system.hostname === 'workstation-b',
      )?.data.totals.totalCost
    })
    .toBe(42)

  await dialog
    .getByRole('button', {
      name: /^(System workstation-b löschen|Delete system workstation-b)$/,
    })
    .click()
  await dialog.getByRole('alertdialog').getByRole('button', { name: deletePattern }).click()
  await expect(dialog.getByText('workstation-b', { exact: true })).toHaveCount(0)

  const finalUsageResponse = await page.request.get(createApiUrl('/api/usage', baseURL), {
    headers: createApiAuthHeaders(),
  })
  expect(finalUsageResponse.ok()).toBe(true)
  const finalUsage = await finalUsageResponse.json()
  expect(finalUsage.systems.map((system: { hostname: string }) => system.hostname)).not.toContain(
    'workstation-b',
  )
})
