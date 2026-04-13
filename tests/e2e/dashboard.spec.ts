import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const sampleUsagePath = path.join(process.cwd(), 'examples', 'sample-usage.json')
const sampleUsage = JSON.parse(fs.readFileSync(sampleUsagePath, 'utf-8'))
const uploadToastPattern =
  /^(Datei sample-usage\.json erfolgreich geladen|File sample-usage\.json loaded successfully)$/
const autoImportButtonPattern = /^(Auto-Import|Auto import)$/
const uploadFileButtonPattern = /^(Datei hochladen|Upload file)$/
const exportSettingsButtonPattern = /^(Einstellungen exportieren|Export settings)$/
const exportDataButtonPattern = /^(Daten exportieren|Export data)$/
const dataImportToastPattern =
  /^(Backup importiert: 1 neue Tage ergänzt, 1 Konflikttage lokal beibehalten|Backup imported: added 1 new days, kept 1 conflicting days local)$/
const saveSettingsButtonPattern = /^(Speichern|Save)$/
const monthlySettingsPattern = /^(Monatlich|Monthly)$/
const monthlyViewPattern = /^(Monatsansicht|Monthly view)$/
const dailyViewPattern = /^(Tagesansicht|Daily view)$/
const last30DaysPattern = /^(Letzte 30 Tage|Last 30 days)$/
const defaultDailyPattern = /^(Täglich|Daily)$/
const allDataPattern = /^(Alle Daten|All data)$/
const viewModeComboboxPattern = /^(Ansichtsmodus|View mode)$/

async function uploadSampleUsage(page: Page) {
  await page.locator('[data-testid="usage-upload-input"]').setInputFiles(sampleUsagePath)
  await expect(page.getByText(uploadToastPattern)).toBeVisible()
}

test('uploads sample usage data and renders the dashboard without browser errors', async ({
  page,
}) => {
  const pageErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      pageErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.request.delete('/api/usage')
  await page.request.delete('/api/settings')

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'TTDash' })).toBeVisible()
  await expect(page.getByRole('button', { name: autoImportButtonPattern })).toBeVisible()
  await expect(page.getByRole('button', { name: uploadFileButtonPattern })).toBeVisible()

  await uploadSampleUsage(page)

  await expect(page.getByRole('button', { name: 'Import' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible()
  await expect(page.locator('#token-analysis')).toBeVisible()

  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})

test('manages settings and backup imports through the settings dialog using isolated test storage', async ({
  page,
}, testInfo) => {
  await page.request.delete('/api/usage')
  await page.request.delete('/api/settings')
  await page.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_DOWNLOAD_RECORDS__?: Array<{
        filename: string
        mimeType: string
        size: number
        text: string
      }>
      __TTDASH_TEST_HOOKS__?: {
        onJsonDownload?: (record: {
          filename: string
          mimeType: string
          size: number
          text: string
        }) => void
        openSettings?: () => void
      }
    }
    globalWindow.__TTDASH_DOWNLOAD_RECORDS__ = []
    globalWindow.__TTDASH_TEST_HOOKS__ = {
      onJsonDownload: (record) => {
        globalWindow.__TTDASH_DOWNLOAD_RECORDS__?.push(record)
      },
    }
  })
  await page.goto('/')
  await uploadSampleUsage(page)
  await expect(page.locator('#token-analysis')).toBeVisible()

  await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: {
        openSettings?: () => void
      }
    }
    globalWindow.__TTDASH_TEST_HOOKS__?.openSettings?.()
  })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-section-id="insights"]')).toContainText(/Insights|Einblicke/)

  await dialog.getByRole('button', { name: monthlySettingsPattern }).click()
  await dialog.getByRole('button', { name: last30DaysPattern }).click()
  await dialog.getByTestId('move-section-up-tokenAnalysis').click()
  await dialog.getByTestId('toggle-section-visibility-tokenAnalysis').click()
  await dialog.getByTestId('reset-all-settings-drafts').click()
  await expect(dialog.getByRole('button', { name: defaultDailyPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(dialog.getByRole('button', { name: allDataPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(dialog.locator('[data-section-id="tokenAnalysis"]')).toContainText(
    /Sichtbar|Visible/,
  )
  await expect
    .poll(async () =>
      dialog
        .locator('[data-section-id]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-section-id'))),
    )
    .toEqual([
      'insights',
      'metrics',
      'today',
      'currentMonth',
      'activity',
      'forecastCache',
      'limits',
      'costAnalysis',
      'tokenAnalysis',
      'requestAnalysis',
      'advancedAnalysis',
      'comparisons',
      'tables',
    ])
  await dialog.getByRole('button', { name: saveSettingsButtonPattern }).click()

  await expect(dialog).toBeHidden()
  await expect(page.locator('#token-analysis')).toBeVisible()
  await expect(
    page.locator('#filters').getByRole('combobox', { name: viewModeComboboxPattern }),
  ).toContainText(dailyViewPattern)

  await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: {
        openSettings?: () => void
      }
    }
    globalWindow.__TTDASH_TEST_HOOKS__?.openSettings?.()
  })
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('reset-default-filters').click()
  await expect(dialog.getByRole('button', { name: defaultDailyPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(dialog.getByRole('button', { name: allDataPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialog.getByRole('button', { name: monthlySettingsPattern }).click()
  await dialog.getByRole('button', { name: last30DaysPattern }).click()
  await dialog.getByTestId('reset-section-visibility').click()
  await expect(dialog.locator('[data-section-id="tokenAnalysis"]')).toContainText(
    /Sichtbar|Visible/,
  )
  await dialog.getByTestId('move-section-up-tokenAnalysis').click()
  await dialog.getByTestId('toggle-section-visibility-tokenAnalysis').click()
  await dialog.getByRole('button', { name: saveSettingsButtonPattern }).click()

  await expect(dialog).toBeHidden()
  await expect(page.locator('#token-analysis')).toHaveCount(0)
  await expect(
    page.locator('#filters').getByRole('combobox', { name: viewModeComboboxPattern }),
  ).toContainText(monthlyViewPattern)

  await page.reload()
  await expect(page.locator('#token-analysis')).toHaveCount(0)
  await expect(
    page.locator('#filters').getByRole('combobox', { name: viewModeComboboxPattern }),
  ).toContainText(monthlyViewPattern)

  await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: {
        openSettings?: () => void
      }
    }
    globalWindow.__TTDASH_TEST_HOOKS__?.openSettings?.()
  })
  await expect(dialog).toBeVisible()

  await page.getByRole('button', { name: exportSettingsButtonPattern }).click()
  await expect
    .poll(async () => {
      const records = await page.evaluate(() => {
        const globalWindow = window as typeof window & {
          __TTDASH_DOWNLOAD_RECORDS__?: Array<{
            filename: string
            mimeType: string
            size: number
            text: string
          }>
        }
        return globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []
      })
      return records.length
    })
    .toBe(1)
  const exportedSettingsRecord = await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_DOWNLOAD_RECORDS__?: Array<{
        filename: string
        mimeType: string
        size: number
        text: string
      }>
    }
    const records = globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []
    return records[0]
  })
  expect(exportedSettingsRecord.filename).toMatch(
    /^ttdash-settings-backup-\d{4}-\d{2}-\d{2}\.json$/,
  )
  const exportedSettings = JSON.parse(exportedSettingsRecord.text)
  expect(exportedSettings.kind).toBe('ttdash-settings-backup')
  expect(exportedSettings.settings.defaultFilters.viewMode).toBe('monthly')
  expect(exportedSettings.settings.defaultFilters.datePreset).toBe('30d')
  expect(exportedSettings.settings.sectionVisibility.tokenAnalysis).toBe(false)
  expect(exportedSettings.settings.sectionOrder.indexOf('tokenAnalysis')).toBeLessThan(
    exportedSettings.settings.sectionOrder.indexOf('costAnalysis'),
  )

  await page.getByRole('button', { name: exportDataButtonPattern }).click()
  await expect
    .poll(async () => {
      const records = await page.evaluate(() => {
        const globalWindow = window as typeof window & {
          __TTDASH_DOWNLOAD_RECORDS__?: Array<{
            filename: string
            mimeType: string
            size: number
            text: string
          }>
        }
        return globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []
      })
      return records.length
    })
    .toBe(2)
  const exportedDataRecord = await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_DOWNLOAD_RECORDS__?: Array<{
        filename: string
        mimeType: string
        size: number
        text: string
      }>
    }
    const records = globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []
    return records[1]
  })
  expect(exportedDataRecord.filename).toMatch(/^ttdash-data-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const exportedData = JSON.parse(exportedDataRecord.text)
  expect(exportedData.kind).toBe('ttdash-usage-backup')
  expect(exportedData.data.daily).toHaveLength(5)

  const importDataPath = testInfo.outputPath('usage-backup-import.json')
  await fsPromises.writeFile(
    importDataPath,
    JSON.stringify(
      {
        kind: 'ttdash-usage-backup',
        version: 1,
        data: {
          daily: [
            sampleUsage.daily[0],
            {
              ...sampleUsage.daily[1],
              totalCost: 999,
            },
            {
              ...sampleUsage.daily[0],
              date: '2026-03-31',
            },
          ],
        },
      },
      null,
      2,
    ),
  )

  await page.locator('[data-testid="data-import-input"]').setInputFiles(importDataPath)
  await expect(page.getByText(dataImportToastPattern)).toBeVisible()

  const mergedUsageResponse = await page.request.get('/api/usage')
  expect(mergedUsageResponse.ok()).toBe(true)
  const mergedUsage = await mergedUsageResponse.json()
  expect(mergedUsage.daily).toHaveLength(6)
  expect(mergedUsage.daily[0].date).toBe('2026-03-31')
  expect(
    mergedUsage.daily.find((day: { date: string }) => day.date === '2026-04-02')?.totalCost,
  ).toBe(3.94)

  const importSettingsPath = testInfo.outputPath('settings-backup-import.json')
  await fsPromises.writeFile(
    importSettingsPath,
    JSON.stringify(
      {
        kind: 'ttdash-settings-backup',
        version: 1,
        settings: {
          language: 'en',
          theme: 'light',
          providerLimits: {
            OpenAI: {
              hasSubscription: true,
              subscriptionPrice: 20,
              monthlyLimit: 400,
            },
          },
          defaultFilters: {
            viewMode: 'monthly',
            datePreset: '30d',
            providers: ['OpenAI'],
            models: ['GPT-5.4'],
          },
          sectionVisibility: {
            tokenAnalysis: false,
            comparisons: false,
          },
          sectionOrder: ['tables', 'advancedAnalysis', 'metrics', 'insights'],
          lastLoadedAt: '2026-04-01T12:30:00.000Z',
          lastLoadSource: 'file',
        },
      },
      null,
      2,
    ),
  )

  await page.locator('[data-testid="settings-import-input"]').setInputFiles(importSettingsPath)
  await expect(page.getByRole('button', { name: 'Export settings' })).toBeVisible()

  const importedSettingsResponse = await page.request.get('/api/settings')
  expect(importedSettingsResponse.ok()).toBe(true)
  const importedSettings = await importedSettingsResponse.json()
  expect(importedSettings.language).toBe('en')
  expect(importedSettings.theme).toBe('light')
  expect(importedSettings.providerLimits.OpenAI.monthlyLimit).toBe(400)
  expect(importedSettings.defaultFilters).toEqual({
    viewMode: 'monthly',
    datePreset: '30d',
    providers: ['OpenAI'],
    models: ['GPT-5.4'],
  })
  expect(importedSettings.sectionVisibility.tokenAnalysis).toBe(false)
  expect(importedSettings.sectionVisibility.comparisons).toBe(false)
  expect(importedSettings.sectionOrder.slice(0, 4)).toEqual([
    'tables',
    'advancedAnalysis',
    'metrics',
    'insights',
  ])
})

test('loads persisted settings on a fresh browser start and applies them immediately', async ({
  browser,
  page,
}) => {
  await page.request.delete('/api/usage')
  await page.request.delete('/api/settings')

  const patchSettingsResponse = await page.request.patch('/api/settings', {
    data: {
      language: 'en',
      theme: 'light',
      providerLimits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 20,
          monthlyLimit: 400,
        },
      },
      defaultFilters: {
        viewMode: 'monthly',
        datePreset: '30d',
        providers: ['OpenAI'],
        models: ['GPT-5.4'],
      },
      sectionVisibility: {
        tokenAnalysis: false,
        comparisons: false,
      },
      sectionOrder: ['tables', 'advancedAnalysis', 'metrics', 'insights'],
    },
  })
  expect(patchSettingsResponse.ok()).toBe(true)

  const uploadResponse = await page.request.post('/api/upload', {
    data: sampleUsage,
  })
  expect(uploadResponse.ok()).toBe(true)

  const context = await browser.newContext()
  await context.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: {
        openSettings?: () => void
      }
    }
    globalWindow.__TTDASH_TEST_HOOKS__ = {}
  })

  const freshPage = await context.newPage()

  try {
    await freshPage.goto('/')
    await expect(freshPage.locator('#token-analysis')).toHaveCount(0)
    await expect(freshPage.locator('#comparisons')).toHaveCount(0)
    await expect
      .poll(async () =>
        freshPage.evaluate(() => document.documentElement.classList.contains('dark')),
      )
      .toBe(false)
    await expect(freshPage.getByRole('button', { name: 'Settings' })).toBeVisible()
    await expect(freshPage.locator('#filters').getByText('Filter status')).toBeVisible()
    await expect(freshPage.locator('#filters').getByText('1 providers active')).toBeVisible()
    await expect(freshPage.locator('#filters').getByText('1 models active')).toBeVisible()
    await expect(
      freshPage.locator('#filters').getByRole('combobox', { name: viewModeComboboxPattern }),
    ).toContainText(monthlyViewPattern)
    await expect(freshPage.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect
      .poll(async () =>
        freshPage.evaluate(() => {
          const tables = document.getElementById('tables')
          const advancedAnalysis = document.getElementById('advanced-analysis')
          const metrics = document.getElementById('metrics')
          const insights = document.getElementById('insights')

          if (!tables || !advancedAnalysis || !metrics || !insights) {
            return false
          }

          const tablesBeforeAdvanced = Boolean(
            tables.compareDocumentPosition(advancedAnalysis) & Node.DOCUMENT_POSITION_FOLLOWING,
          )
          const advancedBeforeMetrics = Boolean(
            advancedAnalysis.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING,
          )
          const metricsBeforeInsights = Boolean(
            metrics.compareDocumentPosition(insights) & Node.DOCUMENT_POSITION_FOLLOWING,
          )

          return tablesBeforeAdvanced && advancedBeforeMetrics && metricsBeforeInsights
        }),
      )
      .toBe(true)

    await freshPage.keyboard.press('Control+k')
    await expect(freshPage.getByTestId('command-section-advancedAnalysis')).toBeVisible()
    const orderedSectionCommandIds = await freshPage
      .locator('[data-testid^="command-section-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid')?.replace('command-section-', '')),
      )
    expect(orderedSectionCommandIds.slice(0, 4)).toEqual([
      'tables',
      'advancedAnalysis',
      'metrics',
      'insights',
    ])
    await freshPage.keyboard.press('Escape')

    await freshPage.evaluate(() => {
      const globalWindow = window as typeof window & {
        __TTDASH_TEST_HOOKS__?: {
          openSettings?: () => void
        }
      }
      globalWindow.__TTDASH_TEST_HOOKS__?.openSettings?.()
    })

    const dialog = freshPage.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Export settings' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'OpenAI', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.locator('[data-section-id="advancedAnalysis"]')).toContainText(
      'Distributions & Risk',
    )
    await expect(dialog.locator('[data-section-id="insights"]')).toContainText('Insights')
    await expect(dialog.locator('[data-section-id="tokenAnalysis"]')).toContainText('Hidden')
    const orderedSectionIds = await dialog
      .locator('[data-section-id]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-section-id')))
    expect(orderedSectionIds.slice(0, 4)).toEqual([
      'tables',
      'advancedAnalysis',
      'metrics',
      'insights',
    ])
    const openAiCard = dialog.locator('[data-provider-id="OpenAI"]')
    await expect(openAiCard.locator('input[type="number"]').nth(0)).toHaveValue('20')
    await expect(openAiCard.locator('input[type="number"]').nth(1)).toHaveValue('400')
    await dialog.getByTestId('reset-provider-limits').click()
    await expect(openAiCard.locator('input[type="number"]').nth(0)).toHaveValue('0')
    await expect(openAiCard.locator('input[type="number"]').nth(1)).toHaveValue('0')
  } finally {
    await context.close()
  }
})

test('uses the current UI language when generating a PDF report after switching locale', async ({
  page,
}) => {
  await page.request.delete('/api/usage')

  let reportRequest: Record<string, unknown> | null = null

  await page.route('**/api/report/pdf', async (route) => {
    reportRequest = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    })
  })

  await page.goto('/')
  await uploadSampleUsage(page)
  await page.getByTitle(/English|Englisch/).click()
  await expect(page.locator('#filters').getByText('Filter status')).toBeVisible()

  await page.getByRole('button', { name: 'Report' }).click()

  await expect.poll(() => reportRequest?.language).toBe('en')
})
