import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, openDashboardFilters } from './fixtures'
import {
  createApiUrl,
  createTrustedMutationHeaders,
  gotoDashboard,
  resetAppState,
  seedUsage,
} from './helpers'
import { createDailyUsage } from '../factories'
import { formatCurrency } from '../../src/lib/formatters'

const models = [
  'gpt-5.4',
  'gpt-5',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5',
  'gemini-3-flash-preview',
  'claude-sonnet-4-5',
  'claude-opus-4-5',
  'gpt-5-mini',
  'o3',
  'grok-4',
  'llama-4',
  'qwen-3',
  'deepseek-v3',
  'mistral-large',
]

const performanceViews =
  process.env.DASHBOARD_PERFORMANCE_VIEWS === 'all'
    ? (['daily', 'monthly', 'yearly'] as const)
    : (['monthly'] as const)

for (const viewMode of performanceViews) {
  for (const motionPreference of ['always', 'never'] as const) {
    for (const days of [365, 3650]) {
      test(`keeps ${days}-day ${viewMode} dashboard filtering responsive and averages correct (${motionPreference} motion)`, async ({
        page,
        baseURL,
        e2eServer,
      }, testInfo) => {
        test.setTimeout(90_000)
        await resetAppState(page, baseURL)
        await page.emulateMedia({
          reducedMotion: motionPreference === 'always' ? 'reduce' : 'no-preference',
        })
        const daily = Array.from({ length: days }, (_, index) =>
          createDailyUsage({
            date: new Date(Date.UTC(2016, 0, index + 1)).toISOString().slice(0, 10),
            modelBreakdowns: models.map((modelName) => ({
              modelName,
              inputTokens: 100,
              outputTokens: 50,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              thinkingTokens: 0,
              cost: 1,
              requestCount: 1,
              requestCountStatus: 'known',
            })),
          }),
        )
        await fs.writeFile(
          path.join(e2eServer.runtimeRoot, 'data', 'data.json'),
          JSON.stringify({ daily }),
        )
        const settings = await page.request.patch(createApiUrl('/api/settings', baseURL), {
          headers: createTrustedMutationHeaders(baseURL),
          data: {
            language: 'en',
            reducedMotionPreference: motionPreference,
            defaultFilters: {
              viewMode,
              datePreset: 'all',
              providers: [],
              models: [],
              systems: [],
            },
          },
        })
        expect(settings.ok()).toBe(true)
        await gotoDashboard(page)
        const periods = new Set(
          daily.map((day) =>
            day.date.slice(0, viewMode === 'yearly' ? 4 : viewMode === 'monthly' ? 7 : 10),
          ),
        ).size
        const unit = viewMode === 'yearly' ? 'year' : viewMode === 'monthly' ? 'mo.' : 'active day'
        const metrics = page.locator('#metrics')
        await expect(metrics).toContainText(`${days}`, { timeout: 20_000 })
        await expect(metrics).toContainText(`${formatCurrency((days * 15) / periods)}/${unit}`)
        await openDashboardFilters(page)
        const filters = page.locator('#filters')
        const model = filters.getByRole('button', { name: 'GPT-5.4', exact: true })
        await expect(model).toBeVisible()
        const times: number[] = []
        for (let index = 0; index < 25; index += 1) {
          const expectedAverage = `${formatCurrency((days * (index % 2 === 0 ? 1 : 15)) / periods)}/${unit}`
          // Measure the click event through the first frame with updated KPIs, excluding driver polling.
          await model.evaluate((button, expected) => {
            button.removeAttribute('data-filter-render-ms')
            button.addEventListener(
              'click',
              () => {
                const start = performance.now()
                const target = document.querySelector('#metrics')!
                const observer = new MutationObserver(() => {
                  if (!target.textContent?.includes(expected)) return
                  observer.disconnect()
                  requestAnimationFrame(() => {
                    button.setAttribute('data-filter-render-ms', String(performance.now() - start))
                  })
                })
                observer.observe(target, { subtree: true, childList: true, characterData: true })
              },
              { once: true, capture: true },
            )
          }, expectedAverage)
          await model.click()
          await expect(model).toHaveAttribute('aria-pressed', index % 2 === 0 ? 'true' : 'false')
          await expect(metrics).toContainText(expectedAverage)
          await expect(model).toHaveAttribute('data-filter-render-ms', /\d/)
          if (index >= 5) times.push(Number(await model.getAttribute('data-filter-render-ms')))
        }
        const p95 = times.sort((a, b) => a - b)[Math.ceil(times.length * 0.95) - 1]!
        const latencyPath = testInfo.outputPath('filter-latency.json')
        await fs.writeFile(
          latencyPath,
          JSON.stringify({
            days,
            viewMode,
            motionPreference,
            models: models.length,
            warmup: 5,
            samples: times.length,
            measurement: 'click to updated KPI frame',
            times,
            p95,
          }),
        )
        await testInfo.attach('filter-latency.json', {
          path: latencyPath,
          contentType: 'application/json',
        })
        // Enforce timing budgets in a separate, isolated run rather than on contended CI workers.
        if (process.env.DASHBOARD_PERFORMANCE_BUDGET === '1')
          expect(p95).toBeLessThan(days === 365 ? 500 : 1000)
        if (days === 365)
          await metrics.screenshot({ path: testInfo.outputPath(`dashboard-${viewMode}.png`) })
      })
    }
  }
}

test('keeps full-month budgets when the analysis date range is narrowed', async ({
  page,
  baseURL,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-04-20T12:00:00Z'))
  await resetAppState(page, baseURL)
  await seedUsage(page, baseURL, {
    daily: [
      createDailyUsage({ date: '2026-04-01', totalCost: 80 }),
      createDailyUsage({ date: '2026-04-20', totalCost: 20 }),
    ],
  })
  const settings = await page.request.patch(createApiUrl('/api/settings', baseURL), {
    headers: createTrustedMutationHeaders(baseURL),
    data: {
      language: 'en',
      reducedMotionPreference: 'always',
      providerLimits: {
        OpenAI: { monthlyLimit: 90, hasSubscription: false, subscriptionPrice: 0 },
      },
    },
  })
  expect(settings.ok()).toBe(true)
  await gotoDashboard(page)
  const limits = page.locator('#limits')
  await limits.scrollIntoViewIfNeeded()
  await expect(limits).toContainText('Focus month cost$100')
  await page
    .locator('#filters')
    .getByRole('button', { name: /^(7D|7T)$/, exact: true })
    .click()
  await limits.scrollIntoViewIfNeeded()
  await expect(limits).toContainText('Focus month cost$100')
  await expect(limits).toContainText(/Limit exceeded/)
  await limits.screenshot({ path: testInfo.outputPath('dashboard-budget.png') })
})
