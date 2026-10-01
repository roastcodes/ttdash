import { expect, test, chartCardByTitle } from './fixtures'
import {
  createApiUrl,
  createTrustedMutationHeaders,
  gotoDashboard,
  resetAppState,
  sampleUsage,
  seedUsage,
} from './helpers'
import { DASHBOARD_SECTION_DEFINITIONS } from '../../src/lib/dashboard-preferences'
import { createDailyUsage } from '../factories'

for (const width of [320, 390, 768, 1024, 1280, 1920]) {
  for (const language of ['de', 'en']) {
    test(`keeps every ${language} analysis readable at ${width}px in both themes`, async ({
      page,
      baseURL,
    }, testInfo) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height: 900 })
      await page.clock.setFixedTime(new Date('2026-04-05T12:00:00Z'))
      await resetAppState(page, baseURL)
      const daily = Array.from({ length: 90 }, (_, i) => ({
        ...sampleUsage.daily[i % sampleUsage.daily.length],
        date: new Date(Date.UTC(2026, 0, i + 6)).toISOString().slice(0, 10),
      }))
      await seedUsage(page, baseURL, { daily })
      expect(
        (
          await page.request.patch(createApiUrl('/api/settings', baseURL), {
            headers: createTrustedMutationHeaders(baseURL),
            data: { language, reducedMotionPreference: 'always' },
          })
        ).ok(),
      ).toBe(true)
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await gotoDashboard(page)
      await page.getByTestId('cost-analysis-details').getByRole('button').click()
      for (const theme of ['dark', 'light']) {
        await page
          .locator('html')
          .evaluate((html, dark) => html.classList.toggle('dark', dark), theme === 'dark')
        for (const section of DASHBOARD_SECTION_DEFINITIONS) {
          const element = page.locator(`#${section.domId}`)
          await element.scrollIntoViewIfNeeded()
          await expect(element).toHaveAttribute('data-section-mounted', 'true')
          const overflow = await page.evaluate(() =>
            [...document.querySelectorAll('section *')]
              .filter(
                (el) =>
                  el.getBoundingClientRect().right > innerWidth + 1 &&
                  getComputedStyle(el).position !== 'absolute',
              )
              .map((el) => ({
                tag: el.tagName,
                text: el.textContent?.slice(0, 90),
                class: el.getAttribute('class'),
                right: el.getBoundingClientRect().right,
              }))
              .slice(0, 12),
          )
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${section.domId}: ${JSON.stringify(overflow)}`,
          ).toBe(true)
          const collisions = await element.evaluate((section) => {
            const collisions: string[] = []
            const overlaps = (a: DOMRect, b: DOMRect) =>
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
            for (const chart of section.querySelectorAll('.recharts-surface')) {
              const x = [
                ...chart.querySelectorAll(
                  '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
                ),
              ]
              const y = [
                ...chart.querySelectorAll(
                  '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value',
                ),
              ]
              for (let i = 1; i < x.length; i++)
                if (overlaps(x[i - 1]!.getBoundingClientRect(), x[i]!.getBoundingClientRect()))
                  collisions.push(`${x[i - 1]!.textContent}/${x[i]!.textContent}`)
              for (const a of x)
                for (const b of y)
                  if (overlaps(a.getBoundingClientRect(), b.getBoundingClientRect()))
                    collisions.push(`${a.textContent}/${b.textContent}`)
            }
            return collisions
          })
          expect(collisions, `${section.domId} axis labels`).toEqual([])
        }
        await page
          .locator('#forecast-cache')
          .screenshot({ path: testInfo.outputPath(`forecast-${theme}.png`) })
        await page
          .locator('#advanced-analysis')
          .screenshot({ path: testInfo.outputPath(`distributions-${theme}.png`) })
      }
      expect(pageErrors).toEqual([])
      // A compact landscape zoom must retain a visible close control and fit its donut.
      await page.setViewportSize({ width, height: 420 })
      const trigger = page
        .locator(
          '#charts button[aria-label*="model"][aria-label$=" expand"], #charts button[aria-label*="Modell"][aria-label$=" vergrössern"]',
        )
        .first()
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      await expect(dialog.locator('button').last()).toBeInViewport()
      const clipped = await dialog.locator('.recharts-pie-sector path').evaluateAll((paths) =>
        paths.some((path) => {
          const shape = path.getBoundingClientRect()
          const plot = path.closest('.recharts-responsive-container')!.getBoundingClientRect()
          return (
            shape.left < plot.left - 1 ||
            shape.right > plot.right + 1 ||
            shape.top < plot.top - 1 ||
            shape.bottom > plot.bottom + 1
          )
        }),
      )
      expect(clipped).toBe(false)
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
    })
  }
}

test('retains long model names, every category and exact zero-range histograms on mobile', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await resetAppState(page, baseURL)
  const names = Array.from(
    { length: 25 },
    (_, i) => `Customexperimentalmodelwithaverylongunbrokenidentifier${i}`,
  )
  const daily = Array.from({ length: 4 }, (_, i) =>
    createDailyUsage({
      date: `2026-04-0${i + 1}`,
      modelBreakdowns: names.map((modelName) => ({
        modelName,
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 50,
        thinkingTokens: 10,
        cost: 0.5,
        requestCount: 2,
        requestCountStatus: 'known',
      })),
    }),
  )
  await seedUsage(page, baseURL, { daily })
  expect(
    (
      await page.request.patch(createApiUrl('/api/settings', baseURL), {
        headers: createTrustedMutationHeaders(baseURL),
        data: { language: 'en', reducedMotionPreference: 'always' },
      })
    ).ok(),
  ).toBe(true)
  await gotoDashboard(page)
  const donut = page.locator('#charts [data-testid="chart-card"]').nth(1)
  await donut.scrollIntoViewIfNeeded()
  for (const name of names)
    await expect(donut.getByText(`${name} ($2.00)`, { exact: true })).toBeVisible()
  const requests = page.locator('#request-analysis')
  await requests.scrollIntoViewIfNeeded()
  await expect(requests).toHaveAttribute('data-section-mounted', 'true')
  await expect(requests.locator('.recharts-bar')).toHaveCount(2)
  const histograms = page.locator('#advanced-analysis')
  await histograms.scrollIntoViewIfNeeded()
  await expect(histograms).toHaveAttribute('data-section-mounted', 'true')
  await expect(histograms.locator('.recharts-bar')).toHaveCount(3)
  await expect(
    chartCardByTitle(histograms, /^Distributions$/)
      .locator('.recharts-xAxis-tick-labels')
      .filter({ hasText: /\S/ }),
  ).toHaveText(['$12.5', '50', '105'])
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter(
        (el) =>
          el.getBoundingClientRect().right > innerWidth + 1 &&
          getComputedStyle(el).position !== 'absolute',
      )
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 90),
        class: el.getAttribute('class'),
        right: el.getBoundingClientRect().right,
      }))
      .slice(-20),
  )
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    JSON.stringify(overflow),
  ).toBe(true)
})
