import { expect, test, type Page } from './fixtures'
import { gotoDashboard, resetAppState, uploadSampleUsage } from './helpers'
import renderedChartDataHelpers from '../../scripts/rendered-chart-data.js'

const { countRenderedChartDataShapes } = renderedChartDataHelpers as {
  countRenderedChartDataShapes: (section: ReturnType<Page['locator']>) => Promise<number>
}

const importEntryButtonPattern = /^(Auto-Import|Auto import|Import)$/
const uploadEntryButtonPattern = /^(Datei hochladen|Upload file|Upload)$/
const csvButtonPattern = /^(CSV|CSV exportieren|Export CSV)$/
const cumulativeProviderCostPattern = /Cumulative cost per provider|Kumulative Kosten pro Anbieter/
const costByModelOverTimePattern = /Cost by model over time|Kosten nach Modell im Zeitverlauf/

function chartCardByTitle(section: ReturnType<Page['locator']>, titlePattern: RegExp) {
  return section
    .getByText(titlePattern)
    .first()
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " group ") and contains(concat(" ", normalize-space(@class), " "), " relative ")][1]',
    )
}

test('uploads sample usage data and renders the dashboard without browser errors', async ({
  page,
  baseURL,
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

  await resetAppState(page, baseURL)

  const dashboardResponse = await gotoDashboard(page)
  const csp = dashboardResponse?.headers()['content-security-policy'] || ''

  await expect(page.getByRole('heading', { name: 'TTDash' })).toBeVisible()
  const cspNonce = await page.locator('meta[name="ttdash-csp-nonce"]').getAttribute('content')
  expect(cspNonce).toMatch(/^[A-Za-z0-9_-]{24}$/)
  expect(csp).toContain(`'nonce-${cspNonce}'`)
  expect(csp).toContain("style-src-attr 'none'")
  expect(csp).not.toContain("'unsafe-inline'")
  await expect(page.getByRole('button', { name: importEntryButtonPattern })).toBeVisible()
  await expect(page.getByRole('button', { name: uploadEntryButtonPattern })).toBeVisible()

  await uploadSampleUsage(page)

  await expect(page.getByRole('button', { name: importEntryButtonPattern })).toBeVisible()
  await expect(page.getByRole('button', { name: uploadEntryButtonPattern })).toBeVisible()
  await expect(page.getByRole('button', { name: csvButtonPattern })).toBeVisible()
  await expect(page.locator('#token-analysis')).toBeVisible()

  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})

test('shows cumulative provider cost next to model cost trends in cost analysis', async ({
  page,
  baseURL,
}) => {
  await resetAppState(page, baseURL)

  await gotoDashboard(page)
  await uploadSampleUsage(page)

  const costAnalysisSection = page.locator('#charts')
  await costAnalysisSection.scrollIntoViewIfNeeded()

  await expect(costAnalysisSection.getByText(/Cost analysis|Kostenanalyse/)).toBeVisible()
  await expect(costAnalysisSection.getByText(cumulativeProviderCostPattern)).toBeVisible()
  await expect(costAnalysisSection.getByText(costByModelOverTimePattern)).toBeVisible()

  const cumulativeProviderCostChart = chartCardByTitle(
    costAnalysisSection,
    cumulativeProviderCostPattern,
  )
  const costByModelOverTimeChart = chartCardByTitle(costAnalysisSection, costByModelOverTimePattern)

  await expect
    .poll(async () => countRenderedChartDataShapes(cumulativeProviderCostChart))
    .toBeGreaterThan(0)
  await expect
    .poll(async () => countRenderedChartDataShapes(costByModelOverTimeChart))
    .toBeGreaterThan(0)
})
