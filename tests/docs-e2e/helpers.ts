import { expect, type Locator, type Page } from '@playwright/test'

export const docsBasePath = '/ttdash/'

export const docsRoutes = {
  home: docsBasePath,
  gettingStarted: `${docsBasePath}getting-started/`,
  configuration: `${docsBasePath}deploying/configuration/`,
  api: `${docsBasePath}reference/http-api/`,
} as const

export async function gotoDocsPage(page: Page, pathname: string) {
  const response = await page.goto(pathname)

  expect(response, `GET ${pathname} should return a response`).not.toBeNull()
  expect(response?.ok(), `GET ${pathname} returned ${response?.status()}`).toBe(true)
  return response
}

export async function firstVisible(locator: Locator) {
  const visibleLocator = locator.filter({ visible: true }).first()
  await visibleLocator.waitFor({ state: 'visible' })
  return visibleLocator
}
