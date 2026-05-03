import { expect, test, type Page } from './fixtures'
import {
  dailyViewPattern,
  mockPdfReport,
  monthlyViewPattern,
  prepareDashboard,
  readDownloadText,
  viewModeComboboxPattern,
} from './helpers'

const commandPaletteTitlePattern = /^(Command Palette|Befehlspalette)$/
const helpDialogTitlePattern = /^(Help & shortcuts|Hilfe & Tastenkürzel)$/
const dateFilterActivePattern = /^(Date filter active|Datumsfilter aktiv)$/
const preset7Pattern = /^(7D|7T)$/

function getPalette(page: Page) {
  return page.getByRole('dialog', { name: commandPaletteTitlePattern })
}

async function openPalette(page: Page) {
  await page.keyboard.press('Control+k')
  const palette = getPalette(page)
  await expect(palette).toBeVisible()
  return palette
}

async function getPaletteCommand(page: Page, testId: string) {
  const palette = await openPalette(page)
  const command = palette.locator(`[data-testid="${testId}"]`)
  await expect(command).toBeVisible()
  return { palette, command }
}

async function runPaletteCommand(page: Page, testId: string) {
  const { palette, command } = await getPaletteCommand(page, testId)
  await command.click()
  await expect(palette).toBeHidden()
}

async function waitForSectionNearTop(page: Page, selector: string) {
  await expect
    .poll(async () => {
      const top = await page.locator(selector).evaluate((node) => {
        return Math.round((node as HTMLElement).getBoundingClientRect().top)
      })
      return Math.abs(top)
    })
    .toBeLessThan(220)
}

test.beforeEach(async ({ page, baseURL }) => {
  await prepareDashboard(page, baseURL)
})

test('opens from the keyboard and shows representative commands', async ({ page }) => {
  const palette = await openPalette(page)

  await expect(palette.locator('[data-testid="command-report"]')).toBeVisible()
  await expect(palette.locator('[data-testid="command-view-monthly"]')).toBeVisible()
  await expect(palette.locator('[data-testid="command-section-costAnalysis"]')).toBeVisible()
})

test('executes a report action command from the command palette', async ({ page }) => {
  const pdfReport = await mockPdfReport(page)
  const downloadPromise = page.waitForEvent('download')

  await page.getByTestId('language-switcher-de').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await runPaletteCommand(page, 'command-report')
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^ttdash-report-\d{4}-\d{2}-\d{2}\.pdf$/)
  const pdf = await readDownloadText(download)
  expect(pdf.startsWith('%PDF-1.4')).toBe(true)
  await expect.poll(() => pdfReport.getReportRequest()?.language).toBe('de')
})

test('executes representative filter and quick-select commands', async ({ page }) => {
  const filters = page.locator('#filters')

  await runPaletteCommand(page, 'command-view-monthly')
  await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
    monthlyViewPattern,
  )

  await runPaletteCommand(page, 'command-preset-7d')
  await expect(filters.getByRole('button', { name: preset7Pattern })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(filters.getByText(dateFilterActivePattern)).toBeVisible()

  const palette = await openPalette(page)
  await palette.locator('input').fill('daily')
  await expect(palette.locator('[data-testid="command-view-daily"]')).toBeVisible()
  await page.keyboard.press('1')

  await expect(palette).toBeHidden()
  await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
    dailyViewPattern,
  )
})

test('executes representative section navigation and help commands', async ({ page }) => {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))
  await runPaletteCommand(page, 'command-section-costAnalysis')
  await waitForSectionNearTop(page, '#charts')

  await runPaletteCommand(page, 'command-help')

  const dialog = page.getByRole('dialog', { name: helpDialogTitlePattern })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
