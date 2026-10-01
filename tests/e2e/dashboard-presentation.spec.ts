import AxeBuilder from '@axe-core/playwright'
import { expect, test, openDashboardFilters, type Page } from './fixtures'
import {
  createApiUrl,
  createTrustedMutationHeaders,
  gotoDashboard,
  resetAppState,
  sampleUsage,
  seedUsage,
  uploadSampleUsage,
  readDownloadText,
} from './helpers'
import { DASHBOARD_SECTION_DEFINITIONS } from '../../src/lib/dashboard-preferences'

async function preparePresentation(page: Page, baseURL: string | undefined, reduced = false) {
  await page.clock.setFixedTime(new Date('2026-04-05T12:00:00Z'))
  await resetAppState(page, baseURL)
  await seedUsage(page, baseURL, sampleUsage)
  const response = await page.request.patch(createApiUrl('/api/settings', baseURL), {
    headers: createTrustedMutationHeaders(baseURL),
    data: { language: 'en', reducedMotionPreference: reduced ? 'always' : 'never' },
  })
  expect(response.ok()).toBe(true)
  await gotoDashboard(page)
}

test('preserves supplementary selections across collapse, filtering, and re-import', async ({
  page,
  baseURL,
}) => {
  await preparePresentation(page, baseURL)
  const metrics = page.locator('#metrics')
  await expect(metrics.getByText('Total cost', { exact: true })).toBeVisible()
  await expect(
    page.getByTestId('filter-details').getByRole('button', { name: 'More filters' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await openDashboardFilters(page)
  await page.locator('#filters').getByRole('button', { name: 'OpenAI', exact: true }).click()
  await page.getByRole('button', { name: 'More filters' }).click()
  await expect(page.getByRole('button', { name: 'Remove OpenAI filter' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove OpenAI filter' }).click()
  await expect(page.getByRole('button', { name: 'Remove OpenAI filter' })).toBeHidden()

  const details = page.getByTestId('cost-analysis-details')
  await details.getByRole('button').click()
  await expect(details.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true')
  await details.evaluate((element) => element.setAttribute('data-retained', 'same-instance'))
  await uploadSampleUsage(page)
  await expect(details).toHaveAttribute('data-retained', 'same-instance')
  await expect(details.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'More filters' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

test('animates plots only in view and keeps zoom statistics, precise exports, and keyboard focus', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 650 })
  await preparePresentation(page, baseURL)
  const card = page
    .locator('#charts')
    .getByTestId('chart-card')
    .filter({
      has: page.getByRole('heading', {
        name: 'Cost over time + moving average',
        exact: true,
        includeHidden: true,
      }),
    })
  const plot = card.locator('[data-chart-animate]').first()
  await expect(plot).toHaveAttribute('data-chart-animate', 'false')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await card.scrollIntoViewIfNeeded()
  await expect(plot).toHaveAttribute('data-chart-animate', 'true')
  const trigger = card.getByRole('button', {
    name: 'Cost over time + moving average expand',
    exact: true,
  })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Cost over time + moving average', exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText('Data points', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Min', { exact: true })).toBeVisible()
  await expect(dialog).toHaveCSS('animation-duration', '0.22s')
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Export CSV' }).click()
  const csv = await readDownloadText(await downloadPromise)
  expect(csv.trim().split('\n')).toHaveLength(sampleUsage.daily.length + 1)
  for (const day of sampleUsage.daily) expect(csv).toContain(day.date)
  const shape = await dialog.locator('.recharts-responsive-container').first().boundingBox()
  expect(shape!.height).toBeGreaterThan(500)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await page.locator('#tables').scrollIntoViewIfNeeded()
  await expect(plot).toHaveAttribute('data-chart-animate', 'false')
  await card.scrollIntoViewIfNeeded()
  await expect(plot).toHaveAttribute('data-chart-animate', 'true')
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Command Palette' })
  await palette.locator('input').fill('Cost analysis')
  await page.keyboard.press('1')
  await expect(palette).toBeHidden()
  await expect(page.locator('#charts')).toBeInViewport()
})

test('retains all twelve KPIs, eight cost charts, and usable zoom windows for every analysis', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000)
  await preparePresentation(page, baseURL, true)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const metrics = page.locator('#metrics')
  for (const label of [
    'Total cost',
    'Total tokens',
    'Requests',
    'Cache share of all tokens',
    'Active days',
    'Top model',
    '$/1M tokens',
    'Thinking',
    'Most expensive day',
    'Dominant provider',
    'Peak 7 days',
    'Median/day',
  ]) {
    await expect(metrics.getByText(label, { exact: true })).toBeVisible()
  }
  await page.getByTestId('cost-analysis-details').getByRole('button').click()
  for (const section of DASHBOARD_SECTION_DEFINITIONS) {
    const element = page.locator(`#${section.domId}`)
    await element.scrollIntoViewIfNeeded()
    await expect(element).toHaveAttribute('data-section-mounted', 'true')
    await expect(element).toHaveAttribute('data-section-visible', 'true')
  }
  await expect(page.locator('#charts').getByTestId('chart-card')).toHaveCount(8)
  const expandButtons = page.locator('section button[aria-label$=" expand"]')
  const names = await expandButtons.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')!),
  )
  expect(names.length).toBeGreaterThanOrEqual(20)
  await testInfo.attach('zoom-inventory.json', {
    body: JSON.stringify(names, null, 2),
    contentType: 'application/json',
  })
  for (const name of names) {
    const trigger = page.locator('section').getByRole('button', { name, exact: true }).first()
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('animation-name', 'none')
    await expect(dialog.locator('[data-zoom-scroll]')).toBeVisible()
    const bounds = await dialog.boundingBox()
    const viewport = page.viewportSize()!
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  }
  expect(errors).toEqual([])
})

for (const width of [390, 768, 1920]) {
  test(`keeps the ${width}px dashboard and zoom usable in both themes`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await preparePresentation(page, baseURL, true)
    const metricToggle = page.getByTestId('metric-details').getByRole('button').first()
    await expect(metricToggle).toHaveAttribute('aria-expanded', String(width >= 768))
    for (const theme of ['dark', 'light']) {
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' })
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^$/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        animations: 'disabled',
        path: testInfo.outputPath(`dashboard-${width}-${theme}.png`),
      })
      const accessibility = await new AxeBuilder({ page })
        .include('header')
        .include('#filters')
        .include('#metrics')
        .analyze()
      expect(accessibility.violations).toEqual([])
      const trigger = page
        .locator('#charts')
        .getByRole('button', { name: 'Cost over time + moving average expand', exact: true })
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport()
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      )
      await page.screenshot({ path: testInfo.outputPath(`zoom-${width}-${theme}.png`) })
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page
        .getByRole('button', { name: theme === 'dark' ? 'Enable light mode' : 'Enable dark mode' })
        .click()
    }
  })
}
