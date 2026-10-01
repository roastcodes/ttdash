import { expect, test, openDashboardFilters } from './fixtures'
import {
  createApiUrl,
  createTrustedMutationHeaders,
  gotoDashboard,
  resetAppState,
  sampleUsage,
  seedUsage,
} from './helpers'

test('keeps every dense point and stable geometry during throttled animation and rapid input', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 350 })
  await resetAppState(page, baseURL)
  const daily = Array.from({ length: 3650 }, (_, i) => ({
    ...sampleUsage.daily[i % sampleUsage.daily.length],
    date: new Date(Date.UTC(2016, 0, i + 1)).toISOString().slice(0, 10),
  }))
  await seedUsage(page, baseURL, { daily })
  expect(
    (
      await page.request.patch(createApiUrl('/api/settings', baseURL), {
        headers: createTrustedMutationHeaders(baseURL),
        data: { language: 'en', reducedMotionPreference: 'never' },
      })
    ).ok(),
  ).toBe(true)
  await gotoDashboard(page)
  await expect(page.locator('#charts [data-testid="chart-card"]')).toHaveCount(2, {
    timeout: 20_000,
  })
  await expect(page.locator('#charts [data-chart-animate]').first()).toHaveAttribute(
    'data-chart-animate',
    'false',
  )
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const frames = await page.evaluate(async () => {
    const diagnostics: Array<{
      active: string | null
      scale: string
      running: number
      curve: boolean
    }> = []
    document.getElementById('charts')!.scrollIntoView({ block: 'start', behavior: 'instant' })
    const frames: Array<{ time: number; scale: number; geometry: string }> = []
    for (let i = 0; i < 90; i++) {
      const time = await new Promise<number>(requestAnimationFrame)
      const rect = document.querySelector('#charts [data-timeseries-reveal]')
      const curve = document.querySelector('#charts .recharts-area-curve')
      diagnostics.push({
        active:
          document
            .querySelector('#charts [data-chart-animate]')
            ?.getAttribute('data-chart-animate') ?? null,
        scale: rect ? getComputedStyle(rect).transform : '',
        running: rect?.getAnimations().length ?? 0,
        curve: Boolean(curve),
      })
      if (rect && curve)
        frames.push({
          time,
          scale: new DOMMatrix(getComputedStyle(rect).transform).a,
          geometry: curve.getAttribute('d') ?? '',
        })
    }
    return { frames, diagnostics }
  })
  await testInfo.attach('diagnostics.json', {
    body: JSON.stringify(frames.diagnostics),
    contentType: 'application/json',
  })
  const geometryFrames = frames.frames
  const intervals = geometryFrames
    .slice(1)
    .map((frame, i) => frame.time - geometryFrames[i]!.time)
    .sort((a, b) => a - b)
  const p95 = intervals[Math.ceil(intervals.length * 0.95) - 1]!
  await testInfo.attach('throttled-frames.json', {
    body: JSON.stringify({
      rate: 4,
      rows: daily.length,
      p95,
      frames: geometryFrames.map(({ time, scale, geometry }) => ({
        time,
        scale,
        commands: (geometry.match(/[CL]/g) ?? []).length,
      })),
    }),
    contentType: 'application/json',
  })
  expect(new Set(geometryFrames.map((frame) => frame.geometry)).size).toBe(1)
  expect((geometryFrames.at(-1)!.geometry.match(/[CL]/g) ?? []).length).toBeGreaterThanOrEqual(
    daily.length - 1,
  )
  expect(geometryFrames.at(-1)!.scale).toBe(1)
  expect(geometryFrames.some((frame) => frame.scale > 0 && frame.scale < 1)).toBe(true)
  if (process.env['DASHBOARD_PERFORMANCE_BUDGET'] === '1') expect(p95).toBeLessThan(50)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await openDashboardFilters(page)
  const provider = page.locator('#filters').getByRole('button', { name: 'OpenAI', exact: true })
  await provider.evaluate((button) => {
    for (let i = 0; i < 6; i++) (button as HTMLButtonElement).click()
  })
  await expect(provider).toHaveAttribute('aria-pressed', 'false')
  const card = page.locator('#charts [data-testid="chart-card"]').first()
  await card.scrollIntoViewIfNeeded()
  await card
    .getByRole('button', { name: 'Cost over time + moving average expand', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Data points', { exact: true })).toBeVisible()
  await expect(dialog.getByText('3650', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
