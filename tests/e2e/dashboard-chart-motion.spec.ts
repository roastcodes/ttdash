import { expect, test } from './fixtures'
import {
  createApiUrl,
  createTrustedMutationHeaders,
  gotoDashboard,
  resetAppState,
  sampleUsage,
  seedUsage,
} from './helpers'

for (const reduced of [false, true]) {
  test(`reveals real time-series and donut geometry only on first visibility (${reduced ? 'reduced' : 'animated'})`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.clock.setFixedTime(new Date('2026-04-05T12:00:00Z'))
    await resetAppState(page, baseURL)
    await seedUsage(page, baseURL, sampleUsage)
    const response = await page.request.patch(createApiUrl('/api/settings', baseURL), {
      headers: createTrustedMutationHeaders(baseURL),
      data: { language: 'en', reducedMotionPreference: reduced ? 'always' : 'never' },
    })
    expect(response.ok()).toBe(true)
    await gotoDashboard(page)
    await expect(page.locator('#charts [data-testid="chart-card"]')).toHaveCount(2)
    await expect(page.locator('#charts .recharts-pie-sector')).toHaveCount(reduced ? 3 : 0)
    const frames = await page.evaluate(async () => {
      document.getElementById('charts')!.scrollIntoView({ block: 'start', behavior: 'instant' })
      const frames: Array<{ time: number; scale: number | null; sectors: string[] }> = []
      for (let frame = 0; frame < 80; frame++) {
        const time = await new Promise<number>(requestAnimationFrame)
        const rect = document.querySelector('#charts [data-timeseries-reveal]')
        const transform = rect ? getComputedStyle(rect).transform : ''
        frames.push({
          time,
          scale: transform && transform !== 'none' ? new DOMMatrix(transform).a : null,
          sectors: [...document.querySelectorAll('#charts .recharts-pie-sector path')].map(
            (path) => path.getAttribute('d') ?? '',
          ),
        })
      }
      return frames
    })
    await testInfo.attach('geometry-frames.json', {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    })
    expect(frames.at(-1)?.scale).toBe(1)
    expect(frames.some((frame) => frame.scale !== null && frame.scale > 0 && frame.scale < 1)).toBe(
      !reduced,
    )
    expect(
      new Set(
        frames.filter((frame) => frame.sectors.length).map((frame) => frame.sectors.join('|')),
      ).size,
    ).toBeGreaterThan(reduced ? 0 : 3)
    const cost = page.locator('#charts [data-testid="chart-card"]').first()
    await expect(cost.locator('.recharts-area-area')).toBeVisible()
    const clip = await cost
      .locator('[data-timeseries-reveal]')
      .evaluate((rect) => rect.parentElement!.id)
    expect(await cost.locator(`g[clip-path="url(#${clip})"]`).count()).toBeGreaterThanOrEqual(2)
    const donut = page.locator('#charts [data-testid="chart-card"]').nth(1)
    const center = donut.locator('svg').getByText('Total', { exact: true })
    await expect(center).toBeVisible()
    const position = await center.evaluate((el) => ({
      box: el.getBoundingClientRect().toJSON(),
      plot: el.closest('svg')!.getBoundingClientRect().toJSON(),
    }))
    expect(position.box.top).toBeGreaterThan(position.plot.top)
    expect(position.box.bottom).toBeLessThan(position.plot.bottom)
    expect(position.box.left + position.box.width / 2).toBeCloseTo(
      position.plot.left + position.plot.width / 2,
      0,
    )
    const final = await donut
      .locator('.recharts-pie-sector path')
      .evaluateAll((paths) => paths.map((path) => path.getAttribute('d')))
    await page.locator('#tables').scrollIntoViewIfNeeded()
    await cost.scrollIntoViewIfNeeded()
    expect(
      await cost
        .locator('[data-timeseries-reveal]')
        .evaluate((rect) => new DOMMatrix(getComputedStyle(rect).transform).a),
    ).toBe(1)
    expect(
      await donut
        .locator('.recharts-pie-sector path')
        .evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))),
    ).toEqual(final)
  })
}
