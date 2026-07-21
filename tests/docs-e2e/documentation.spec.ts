import packageJson from '../../package.json'
import { test, expect } from './fixtures'
import { docsBasePath, docsRoutes, firstVisible, gotoDocsPage } from './helpers'

test('loads the homepage with the release version and base-scoped assets', async ({ page }) => {
  await gotoDocsPage(page, docsRoutes.home)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Understand every token.' }),
  ).toBeVisible()
  await expect(page.locator('[data-ttdash-version]')).toHaveAttribute(
    'data-ttdash-version',
    packageJson.version,
  )
  await expect(page.locator('[data-ttdash-version]')).toContainText(`v${packageJson.version}`)

  const resourceUrls = await page
    .locator('link[href], script[src], img[src]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
        .filter((value): value is string => Boolean(value))
        .map((value) => new URL(value, window.location.href).toString())
        .filter((value) => new URL(value).origin === window.location.origin),
    )

  expect(resourceUrls.length).toBeGreaterThan(1)
  for (const resourceUrl of new Set(resourceUrls)) {
    expect(new URL(resourceUrl).pathname, resourceUrl).toMatch(/^\/ttdash(?:\/|$)/)
    const response = await page.request.get(resourceUrl)
    expect(response.ok(), `${resourceUrl} returned ${response.status()}`).toBe(true)
  }

  await expect(page.getByRole('link', { name: 'Edit page' })).toHaveAttribute(
    'href',
    'https://github.com/roastcodes/ttdash/edit/main/docs-site/src/content/docs/index.mdx',
  )
})

test('supports direct page loads and sidebar navigation', async ({ page }) => {
  await gotoDocsPage(page, docsRoutes.gettingStarted)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Install and run TTDash' }),
  ).toBeVisible()

  const configurationLink = await firstVisible(
    page.getByRole('link', { name: 'Configuration & CLI', exact: true }),
  )
  await configurationLink.click()

  await expect(page).toHaveURL(new RegExp(`${docsRoutes.configuration}$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Configuration and CLI' })).toBeVisible()
})

test('provides local search and a persistent theme choice', async ({ page }) => {
  await gotoDocsPage(page, docsRoutes.home)

  const searchButton = await firstVisible(page.getByRole('button', { name: /search/i }))
  await searchButton.click()
  const searchInput = await firstVisible(
    page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)),
  )
  await searchInput.fill('configuration')

  const searchResult = page
    .locator('dialog[open]')
    .getByRole('link', { name: /Configuration/i })
    .first()
  await expect(searchResult).toBeVisible({ timeout: 15_000 })

  await page.keyboard.press('Escape')
  const themeSelector = await firstVisible(page.getByLabel(/select theme/i))
  await themeSelector.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('exposes usable mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoDocsPage(page, docsRoutes.gettingStarted)

  const menuButton = await firstVisible(page.getByRole('button', { name: /menu/i }))
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  await menuButton.click()
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')

  const apiLink = await firstVisible(page.getByRole('link', { name: /HTTP API/i }))
  await expect(apiLink).toBeVisible()
  await apiLink.click()
  await expect(page).toHaveURL(new RegExp(`${docsRoutes.api}$`))
})

test('serves a useful 404 page beneath the project base path', async ({ page }) => {
  const response = await page.goto(`${docsBasePath}missing-documentation-page/`)

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
  await expect(page.getByText(/Page not found/i)).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link').first()).toHaveAttribute(
    'href',
    docsBasePath,
  )
})
