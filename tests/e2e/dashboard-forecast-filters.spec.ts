import { expect, test } from '@playwright/test'
import { gotoDashboard, resetAppState, uploadSampleUsage } from './helpers'

const costForecastExpandPattern =
  /^(Current month cost forecast expand|Kostenprognose aktueller Monat vergrössern)$/
const providerForecastExpandPattern =
  /^(Current month forecast by provider expand|Monatsprognose nach Anbieter vergrössern)$/
const forecastDialogTitlePattern = /^(Forecast details|Prognose-Details)$/
const providersActivePattern = /^(1 providers active|1 Anbieter aktiv)$/
const modelsActivePattern = /^(1 models active|1 Modelle aktiv)$/
const dateFilterActivePattern = /^(Date filter active|Datumsfilter aktiv)$/

test('opens one shared forecast zoom dialog from both forecast cards', async ({
  page,
  baseURL,
}) => {
  await resetAppState(page, baseURL)

  await gotoDashboard(page)
  await uploadSampleUsage(page)

  const forecastSection = page.locator('#forecast-cache')
  await forecastSection.scrollIntoViewIfNeeded()
  await expect(forecastSection.getByText(/Forecast & Cache|Prognose & Cache/)).toBeVisible()

  const costExpandButton = page.getByRole('button', { name: costForecastExpandPattern })
  await expect(costExpandButton).toBeVisible()
  await costExpandButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByTestId('forecast-zoom-dialog-body')).toBeVisible()
  await expect(dialog.getByText(forecastDialogTitlePattern)).toBeVisible()
  await expect(dialog.getByText(/Month-end forecast|Prognose Monatsende/)).toBeVisible()
  await expect(
    dialog.getByText(/Current month cost forecast|Kostenprognose aktueller Monat/),
  ).toBeVisible()
  await expect(
    dialog.getByText(/Current month forecast by provider|Monatsprognose nach Anbieter/),
  ).toBeVisible()
  await expect(
    dialog.locator('[data-testid="provider-forecast-chip"][data-provider="OpenAI"]'),
  ).toBeVisible()
  await expect(
    dialog.locator('[data-testid="provider-forecast-chip"][data-provider="Anthropic"]'),
  ).toBeVisible()
  await expect(
    dialog.getByText(/Current month cost forecast|Kostenprognose aktueller Monat/),
  ).toHaveCount(1)
  const dialogBox = await dialog.boundingBox()
  const titleBox = await dialog.getByText(forecastDialogTitlePattern).boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(titleBox).not.toBeNull()
  expect((titleBox?.y ?? Infinity) - (dialogBox?.y ?? 0)).toBeLessThan(120)
  await dialog.getByRole('button', { name: /Close|Schliessen/ }).click()
  await expect(dialog).toBeHidden()

  const providerExpandButton = page.getByRole('button', { name: providerForecastExpandPattern })
  await expect(providerExpandButton).toBeVisible()
  await providerExpandButton.click()

  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(forecastDialogTitlePattern)).toBeVisible()
  await expect(
    dialog.getByText(/Current month forecast by provider|Monatsprognose nach Anbieter/),
  ).toBeVisible()
})

test('exposes pressed filter state and supports keyboard date selection in the dashboard filters', async ({
  page,
  baseURL,
}) => {
  await resetAppState(page, baseURL)

  await gotoDashboard(page)
  await uploadSampleUsage(page)

  const filters = page.locator('#filters')
  const openAiFilter = filters.getByRole('button', { name: 'OpenAI', exact: true })
  const anthropicFilter = filters.getByRole('button', { name: 'Anthropic', exact: true })
  const modelFilter = filters.getByRole('button', { name: 'GPT-5.4', exact: true })
  const startDateTrigger = filters.locator('button[aria-haspopup="dialog"]').first()

  await openAiFilter.click()
  await modelFilter.click()

  await expect(openAiFilter).toHaveAttribute('aria-pressed', 'true')
  await expect(anthropicFilter).toHaveAttribute('aria-pressed', 'false')
  await expect(modelFilter).toHaveAttribute('aria-pressed', 'true')
  await expect(filters.getByText(providersActivePattern)).toBeVisible()
  await expect(filters.getByText(modelsActivePattern)).toBeVisible()

  await startDateTrigger.focus()
  await page.keyboard.press('Enter')

  await expect(startDateTrigger).toHaveAttribute('aria-expanded', 'true')
  const dateDialog = page.getByRole('dialog')
  await expect(dateDialog).toBeVisible()

  const focusedDayBefore = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? '',
  )

  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(
    (previous) => (document.activeElement?.textContent?.trim() ?? '') !== previous,
    focusedDayBefore,
  )

  const focusedDayAfter = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? '',
  )
  expect(focusedDayAfter).not.toBe(focusedDayBefore)
  expect(focusedDayAfter).toMatch(/^\d+$/)

  await page.keyboard.press('Enter')

  await expect(dateDialog).toBeHidden()
  await expect(startDateTrigger).toBeFocused()
  await expect(filters.getByText(dateFilterActivePattern)).toBeVisible()
})
