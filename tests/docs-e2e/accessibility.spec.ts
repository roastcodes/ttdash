import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { docsRoutes, gotoDocsPage } from './helpers'

const accessibilityPages = [
  ['home', docsRoutes.home],
  ['getting started', docsRoutes.gettingStarted],
  ['configuration', docsRoutes.configuration],
  ['HTTP API', docsRoutes.api],
] as const

for (const [name, pathname] of accessibilityPages) {
  test(`${name} has no automatically detectable accessibility violations`, async ({ page }) => {
    await gotoDocsPage(page, pathname)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}
