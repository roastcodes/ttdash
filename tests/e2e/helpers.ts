import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Download,
  type Page,
} from '@playwright/test'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

export const sampleUsagePath = path.join(process.cwd(), 'examples', 'sample-usage.json')

export const uploadToastPattern =
  /^(Datei sample-usage\.json erfolgreich geladen|File sample-usage\.json loaded successfully)$/
export const viewModeComboboxPattern = /^(Ansichtsmodus|View mode)$/
export const dailyViewPattern = /^(Tagesansicht|Daily view)$/
export const monthlyViewPattern = /^(Monatsansicht|Monthly view)$/
export const filterStatusPattern = /^(Filterstatus|Filter status)$/

export type SampleUsageDay = Record<string, unknown> & {
  date: string
  totalCost?: number
}

export type SampleUsage = Record<string, unknown> & {
  daily: SampleUsageDay[]
  totals?: Record<string, unknown>
}

export type JsonDownloadRecord = {
  filename: string
  mimeType: string
  size: number
  text: string
}

type LocalAuthSession = {
  authorizationHeader: string
  bootstrapUrl: string
}

type InitScriptTarget = {
  addInitScript: (script: () => void) => Promise<void>
}

type ApiRequestMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST'
type ApiRequestOptions = Parameters<APIRequestContext['fetch']>[1]

const transientApiRequestErrorPattern =
  /(socket hang up|ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|Request context disposed|Target page, context or browser has been closed)/i
const apiRequestRetryAttempts = 3
const apiRequestRetryDelayMs = 150

export const sampleUsage = JSON.parse(fs.readFileSync(sampleUsagePath, 'utf-8')) as SampleUsage

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientApiRequestError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return transientApiRequestErrorPattern.test(message)
}

async function apiResponseErrorMessage(response: APIResponse, context: string) {
  let body = ''

  try {
    body = await response.text()
  } catch (error) {
    body = `Could not read response body: ${error instanceof Error ? error.message : String(error)}`
  }

  return `${context} failed with ${response.status()} ${response.statusText()}: ${body}`
}

async function expectApiResponseOk(response: APIResponse, context: string) {
  if (response.ok()) {
    return
  }

  throw new Error(await apiResponseErrorMessage(response, context))
}

async function requestApiWithRetry(
  request: APIRequestContext,
  method: ApiRequestMethod,
  url: string,
  options: ApiRequestOptions = {},
) {
  let lastError: unknown

  for (let attempt = 1; attempt <= apiRequestRetryAttempts; attempt += 1) {
    try {
      return await request.fetch(url, {
        ...options,
        method,
      })
    } catch (error) {
      lastError = error
      if (attempt === apiRequestRetryAttempts || !isTransientApiRequestError(error)) {
        throw error
      }

      await sleep(apiRequestRetryDelayMs * attempt)
    }
  }

  throw lastError
}

export function createApiUrl(pathname: string, baseURL?: string) {
  if (!baseURL) {
    throw new Error('Playwright baseURL is required for API requests')
  }

  return new URL(pathname, baseURL).toString()
}

function getRequiredPlaywrightEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for Playwright API authentication`)
  }
  return value
}

export function readLocalAuthSession() {
  return {
    authorizationHeader: getRequiredPlaywrightEnv('PLAYWRIGHT_TEST_AUTHORIZATION_HEADER'),
    bootstrapUrl: getRequiredPlaywrightEnv('PLAYWRIGHT_TEST_BOOTSTRAP_URL'),
  } satisfies LocalAuthSession
}

export function createApiAuthHeaders() {
  return {
    Authorization: readLocalAuthSession().authorizationHeader,
  }
}

export function createTrustedMutationHeaders(baseURL?: string) {
  if (!baseURL) {
    throw new Error('Playwright baseURL is required for trusted mutation headers')
  }

  return {
    ...createApiAuthHeaders(),
    Origin: new URL(baseURL).origin,
  }
}

export async function resetAppState(page: Page, baseURL?: string) {
  const trustedMutationHeaders = createTrustedMutationHeaders(baseURL)
  const usageResponse = await requestApiWithRetry(
    page.request,
    'DELETE',
    createApiUrl('/api/usage', baseURL),
    { headers: trustedMutationHeaders },
  )
  await expectApiResponseOk(usageResponse, 'DELETE /api/usage')

  const settingsResponse = await requestApiWithRetry(
    page.request,
    'DELETE',
    createApiUrl('/api/settings', baseURL),
    { headers: trustedMutationHeaders },
  )
  await expectApiResponseOk(settingsResponse, 'DELETE /api/settings')
}

export async function gotoDashboard(page: Page) {
  return await page.goto(readLocalAuthSession().bootstrapUrl)
}

export async function uploadSampleUsage(page: Page) {
  await page.locator('[data-testid="usage-upload-input"]').setInputFiles(sampleUsagePath)
  await expect(page.getByText(uploadToastPattern)).toBeVisible()
}

function toLocalDateStr(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, offset: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

export function buildRelativeUsageData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    ...sampleUsage,
    daily: sampleUsage.daily.map((entry, index, array) => ({
      ...entry,
      date: toLocalDateStr(addDays(today, index - (array.length - 1))),
    })),
  }
}

export async function seedUsage(
  page: Page,
  baseURL?: string,
  usageData: SampleUsage = buildRelativeUsageData(),
) {
  const trustedMutationHeaders = createTrustedMutationHeaders(baseURL)
  const uploadResponse = await requestApiWithRetry(
    page.request,
    'POST',
    createApiUrl('/api/upload', baseURL),
    {
      headers: trustedMutationHeaders,
      data: usageData,
    },
  )

  await expectApiResponseOk(uploadResponse, 'POST /api/upload')
  return usageData
}

export async function loadDashboard(page: Page) {
  await gotoDashboard(page)
  await expect(page.getByRole('heading', { name: 'TTDash' })).toBeVisible()
  await expect(page.locator('#filters').getByText(filterStatusPattern)).toBeVisible()
  await expect(page.locator('#token-analysis')).toBeVisible()
}

export async function prepareDashboard(page: Page, baseURL?: string) {
  await resetAppState(page, baseURL)
  await seedUsage(page, baseURL)
  await loadDashboard(page)
}

export async function readDownloadText(download: Download) {
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  return fsPromises.readFile(downloadPath as string, 'utf-8')
}

export async function mockAutoImportStream(page: Page) {
  await page.route('**/api/auto-import/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: [
        'event: check',
        `data: ${JSON.stringify({
          tool: 'toktrack',
          status: 'found',
          method: 'mock',
          version: TOKTRACK_VERSION,
        })}`,
        '',
        'event: progress',
        'data: {"key":"startingLocalImport"}',
        '',
        'event: success',
        'data: {"days":5,"totalCost":19.87}',
        '',
        'event: done',
        'data: {}',
        '',
      ].join('\n'),
    })
  })
}

export async function mockPdfReport(page: Page) {
  let reportRequest: Record<string, unknown> | null = null

  await page.route('**/api/report/pdf', async (route) => {
    reportRequest = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    })
  })

  return {
    getReportRequest: () => reportRequest,
  }
}

export async function installDashboardTestHookContainer(target: InitScriptTarget) {
  await target.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: Record<string, unknown>
    }

    globalWindow.__TTDASH_TEST_HOOKS__ = globalWindow.__TTDASH_TEST_HOOKS__ ?? {}
  })
}

export async function installJsonDownloadRecorder(page: Page) {
  await page.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_DOWNLOAD_RECORDS__?: JsonDownloadRecord[]
      __TTDASH_TEST_HOOKS__?: {
        onJsonDownload?: (record: JsonDownloadRecord) => void
        openSettings?: () => void
      }
    }

    globalWindow.__TTDASH_DOWNLOAD_RECORDS__ = []
    globalWindow.__TTDASH_TEST_HOOKS__ = {
      ...(globalWindow.__TTDASH_TEST_HOOKS__ ?? {}),
      onJsonDownload: (record) => {
        globalWindow.__TTDASH_DOWNLOAD_RECORDS__?.push(record)
      },
    }
  })
}

export async function openSettingsViaTestHook(page: Page) {
  await page.evaluate(() => {
    const globalWindow = window as typeof window & {
      __TTDASH_TEST_HOOKS__?: {
        openSettings?: () => void
      }
    }

    globalWindow.__TTDASH_TEST_HOOKS__?.openSettings?.()
  })
}

export async function waitForJsonDownloadCount(page: Page, count: number) {
  await expect
    .poll(async () => {
      const records = await page.evaluate(() => {
        const globalWindow = window as typeof window & {
          __TTDASH_DOWNLOAD_RECORDS__?: JsonDownloadRecord[]
        }

        return globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []
      })
      return records.length
    })
    .toBe(count)
}

export async function readJsonDownloadRecord(page: Page, index: number) {
  const record = await page.evaluate((recordIndex) => {
    const globalWindow = window as typeof window & {
      __TTDASH_DOWNLOAD_RECORDS__?: JsonDownloadRecord[]
    }
    const records = globalWindow.__TTDASH_DOWNLOAD_RECORDS__ ?? []

    return records[recordIndex]
  }, index)

  expect(record).toBeDefined()
  return record
}
