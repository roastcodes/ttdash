import fsPromises from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  createApiAuthHeaders,
  createTrustedMutationHeaders,
  dailyViewPattern,
  filterStatusPattern,
  gotoDashboard,
  installDashboardTestHookContainer,
  installJsonDownloadRecorder,
  monthlyViewPattern,
  openSettingsViaTestHook,
  readJsonDownloadRecord,
  resetAppState,
  sampleUsage,
  uploadSampleUsage,
  viewModeComboboxPattern,
  waitForJsonDownloadCount,
} from './helpers'

const exportSettingsButtonPattern = /^(Einstellungen exportieren|Export settings)$/
const exportDataButtonPattern = /^(Daten exportieren|Export data)$/
const saveSettingsButtonPattern = /^(Speichern|Save)$/
const monthlySettingsPattern = /^(Monatlich|Monthly)$/
const last30DaysPattern = /^(Letzte 30 Tage|Last 30 days)$/
const defaultDailyPattern = /^(Täglich|Daily)$/
const allDataPattern = /^(Alle Daten|All data)$/
const settingsBasicsTabPattern = /Basis|Basics/
const settingsLayoutTabPattern = /Layout/
const settingsMaintenanceTabPattern = /Wartung|Maintenance/
const settingsButtonPattern = /^(Settings|Einstellungen)$/
const providersActivePattern = /^(1 providers active|1 Anbieter aktiv)$/
const modelsActivePattern = /^(1 models active|1 Modelle aktiv)$/
const deleteButtonPattern = /^(Delete|Löschen)$/

test('manages settings and backup imports through the settings dialog using isolated test storage', async ({
  page,
  baseURL,
}, testInfo) => {
  await resetAppState(page, baseURL)
  await installJsonDownloadRecorder(page)
  await gotoDashboard(page)
  await uploadSampleUsage(page)
  await expect(page.locator('#token-analysis')).toBeVisible()

  await openSettingsViaTestHook(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await dialog.getByRole('tab', { name: settingsLayoutTabPattern }).click()
  await expect(dialog.locator('[data-section-id="insights"]')).toContainText(/Insights|Einblicke/)

  await dialog.getByRole('tab', { name: settingsBasicsTabPattern }).click()
  await dialog.getByRole('button', { name: monthlySettingsPattern }).click()
  await dialog.getByRole('button', { name: last30DaysPattern }).click()
  await dialog.getByRole('tab', { name: settingsLayoutTabPattern }).click()
  await dialog.getByTestId('move-section-up-tokenAnalysis').click()
  await dialog.getByTestId('toggle-section-visibility-tokenAnalysis').click()
  await dialog.getByTestId('reset-all-settings-drafts').click()
  await dialog.getByRole('tab', { name: settingsBasicsTabPattern }).click()
  await expect(dialog.getByRole('button', { name: defaultDailyPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(dialog.getByRole('button', { name: allDataPattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await dialog.getByRole('tab', { name: settingsLayoutTabPattern }).click()
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

  await openSettingsViaTestHook(page)
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
  await dialog.getByTestId('settings-reduced-motion-always').click()
  await dialog.getByRole('tab', { name: settingsLayoutTabPattern }).click()
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

  await openSettingsViaTestHook(page)
  await expect(dialog).toBeVisible()

  await dialog.getByRole('tab', { name: settingsMaintenanceTabPattern }).click()
  await page.getByRole('button', { name: exportSettingsButtonPattern }).click()
  await waitForJsonDownloadCount(page, 1)
  const exportedSettingsRecord = await readJsonDownloadRecord(page, 0)
  expect(exportedSettingsRecord.filename).toMatch(
    /^ttdash-settings-backup-\d{4}-\d{2}-\d{2}\.json$/,
  )
  const exportedSettings = JSON.parse(exportedSettingsRecord.text)
  expect(exportedSettings.kind).toBe('ttdash-settings-backup')
  expect(exportedSettings.settings.reducedMotionPreference).toBe('always')
  expect(exportedSettings.settings.defaultFilters.viewMode).toBe('monthly')
  expect(exportedSettings.settings.defaultFilters.datePreset).toBe('30d')
  expect(exportedSettings.settings.sectionVisibility.tokenAnalysis).toBe(false)
  expect(exportedSettings.settings.sectionOrder.indexOf('tokenAnalysis')).toBeLessThan(
    exportedSettings.settings.sectionOrder.indexOf('costAnalysis'),
  )

  await page.getByRole('button', { name: exportDataButtonPattern }).click()
  await waitForJsonDownloadCount(page, 2)
  const exportedDataRecord = await readJsonDownloadRecord(page, 1)
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

  await expect
    .poll(async () => {
      const response = await page.request.get('/api/usage', { headers: createApiAuthHeaders() })
      const usage = await response.json()
      return usage.daily[0]?.date
    })
    .toBe('2026-03-31')

  const mergedUsageResponse = await page.request.get('/api/usage', {
    headers: createApiAuthHeaders(),
  })
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
          reducedMotionPreference: 'never',
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
  await expect(page.getByRole('button', { name: exportSettingsButtonPattern })).toBeVisible()

  const importedSettingsResponse = await page.request.get('/api/settings', {
    headers: createApiAuthHeaders(),
  })
  expect(importedSettingsResponse.ok()).toBe(true)
  const importedSettings = await importedSettingsResponse.json()
  expect(importedSettings.language).toBe('en')
  expect(importedSettings.theme).toBe('light')
  expect(importedSettings.reducedMotionPreference).toBe('never')
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
  baseURL,
}) => {
  await resetAppState(page, baseURL)

  const trustedMutationHeaders = createTrustedMutationHeaders(baseURL)
  const patchSettingsResponse = await page.request.patch('/api/settings', {
    headers: trustedMutationHeaders,
    data: {
      language: 'en',
      theme: 'light',
      reducedMotionPreference: 'always',
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
    headers: trustedMutationHeaders,
    data: sampleUsage,
  })
  expect(uploadResponse.ok()).toBe(true)

  const context = await browser.newContext()
  await installDashboardTestHookContainer(context)

  const freshPage = await context.newPage()

  try {
    await gotoDashboard(freshPage)
    await expect(freshPage.locator('#token-analysis')).toHaveCount(0)
    await expect(freshPage.locator('#comparisons')).toHaveCount(0)
    await expect
      .poll(async () =>
        freshPage.evaluate(() => document.documentElement.classList.contains('dark')),
      )
      .toBe(false)
    await expect(freshPage.getByRole('button', { name: settingsButtonPattern })).toBeVisible()
    await expect(freshPage.locator('#filters').getByText(filterStatusPattern)).toBeVisible()
    await expect(freshPage.locator('#filters').getByText(providersActivePattern)).toBeVisible()
    await expect(freshPage.locator('#filters').getByText(modelsActivePattern)).toBeVisible()
    await expect(
      freshPage.locator('#filters').getByRole('combobox', { name: viewModeComboboxPattern }),
    ).toContainText(monthlyViewPattern)
    await expect(freshPage.getByRole('button', { name: deleteButtonPattern })).toBeVisible()
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

    await openSettingsViaTestHook(freshPage)

    const dialog = freshPage.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('tab', { name: settingsMaintenanceTabPattern }).click()
    await expect(dialog.getByRole('button', { name: 'Export settings' })).toBeVisible()
    await dialog.getByRole('tab', { name: settingsBasicsTabPattern }).click()
    await expect(dialog.getByTestId('settings-reduced-motion-always')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await dialog.getByRole('tab', { name: settingsLayoutTabPattern }).click()
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
    await dialog.getByRole('tab', { name: /Limits/ }).click()
    const openAiCard = dialog.locator('[data-provider-id="OpenAI"]')
    await expect(openAiCard).toBeVisible()
    await expect(openAiCard.locator('input').nth(0)).toHaveValue('20')
    await expect(openAiCard.locator('input').nth(1)).toHaveValue('400')
    await dialog.getByTestId('reset-provider-limits').click()
    await expect(openAiCard.locator('input').nth(0)).toHaveValue('0')
    await expect(openAiCard.locator('input').nth(1)).toHaveValue('0')
  } finally {
    await context.close()
  }
})
