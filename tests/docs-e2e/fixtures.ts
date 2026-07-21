import { test as base, expect, type Response } from '@playwright/test'

type DocsFixtures = {
  assertCleanBrowserLog: void
}

const expectedNotFoundPath = '/ttdash/missing-documentation-page/'

function isExpectedNotFoundConsoleError(message: {
  location: () => { url?: string }
  text: () => string
}) {
  if (
    message.text() !==
    'Failed to load resource: the server responded with a status of 404 (Not Found)'
  ) {
    return false
  }

  try {
    return new URL(message.location().url || '').pathname === expectedNotFoundPath
  } catch {
    return false
  }
}

function isExpectedNotFoundResponse(response: Response) {
  try {
    return (
      response.status() === 404 &&
      response.request().resourceType() === 'document' &&
      new URL(response.url()).pathname === expectedNotFoundPath
    )
  } catch {
    return false
  }
}

export const test = base.extend<DocsFixtures>({
  assertCleanBrowserLog: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = []

      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          !(
            testInfo.title === 'serves a useful 404 page beneath the project base path' &&
            isExpectedNotFoundConsoleError(message)
          )
        ) {
          errors.push(`console.error: ${message.text()}`)
        }
      })
      page.on('pageerror', (error) => {
        errors.push(`pageerror: ${error.message}`)
      })
      page.on('response', (response) => {
        if (
          response.status() >= 400 &&
          !(
            testInfo.title === 'serves a useful 404 page beneath the project base path' &&
            isExpectedNotFoundResponse(response)
          )
        ) {
          errors.push(`response ${response.status()}: ${response.url()}`)
        }
      })

      await use()

      expect(errors, 'documentation pages must not emit browser errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
