import { expect, test, type Page } from './fixtures'
import {
  dailyViewPattern,
  mockAutoImportStream,
  mockPdfReport,
  monthlyViewPattern,
  prepareDashboard,
  readDownloadText,
  viewModeComboboxPattern,
} from './helpers'

const commandPaletteTitlePattern = /^Command [Pp]alette$/
const settingsDialogTitlePattern = /^(Settings|Einstellungen)$/
const helpDialogTitlePattern = /^(Help & shortcuts|Hilfe & Tastenkürzel)$/
const autoImportDialogTitlePattern = /^(Toktrack auto import|Toktrack Auto-Import)$/
const closeButtonPattern = /^(Close|Schliessen)$/
const autoImportButtonPattern = /^(Auto-Import|Auto import)$/
const uploadFileButtonPattern = /^(Datei hochladen|Upload file)$/
const yearlyViewPattern = /^(Jahresansicht|Yearly view)$/
const providersActivePattern = /^(1 providers active|1 Anbieter aktiv)$/
const modelsActivePattern = /^(1 models active|1 Modelle aktiv)$/
const dateFilterActivePattern = /^(Date filter active|Datumsfilter aktiv)$/
const preset7Pattern = /^(7D|7T)$/
const preset30Pattern = /^(30D|30T)$/
const presetMonthPattern = /^(Month|Monat)$/
const presetYearPattern = /^(Year|Jahr)$/
const presetAllPattern = /^(All|Alle)$/

const providerLabels = ['Anthropic', 'Google', 'OpenAI']
const modelLabels = ['Claude Sonnet 4.5', 'Gemini 2.5 Pro', 'GPT-5.4']
const sectionCommands = [
  { testId: 'command-section-insights', selector: '#insights' },
  { testId: 'command-section-metrics', selector: '#metrics' },
  { testId: 'command-section-today', selector: '#today' },
  { testId: 'command-section-currentMonth', selector: '#current-month' },
  { testId: 'command-section-activity', selector: '#activity' },
  { testId: 'command-section-forecastCache', selector: '#forecast-cache' },
  { testId: 'command-section-limits', selector: '#limits' },
  { testId: 'command-section-costAnalysis', selector: '#charts' },
  { testId: 'command-section-tokenAnalysis', selector: '#token-analysis' },
  { testId: 'command-section-requestAnalysis', selector: '#request-analysis' },
  { testId: 'command-section-advancedAnalysis', selector: '#advanced-analysis' },
  { testId: 'command-section-comparisons', selector: '#comparisons' },
  { testId: 'command-section-tables', selector: '#tables' },
] as const

const expectedCommandTestIds = [
  'command-auto-import',
  'command-settings-open',
  'command-csv',
  'command-report',
  'command-upload',
  'command-delete',
  'command-view-daily',
  'command-view-monthly',
  'command-view-yearly',
  'command-preset-7d',
  'command-preset-30d',
  'command-preset-month',
  'command-preset-year',
  'command-preset-all',
  'command-clear-providers',
  'command-clear-models',
  'command-clear-dates',
  'command-reset-all',
  'command-top',
  'command-bottom',
  'command-filters',
  'command-theme',
  'command-language-de',
  'command-language-en',
  'command-help',
  ...sectionCommands.map((command) => command.testId),
  ...providerLabels.map((provider) => `command-provider-${provider}`),
  ...modelLabels.map((model) => `command-model-${model}`),
].sort()

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

async function runSectionNavigationCommands(
  page: Page,
  commands: readonly (typeof sectionCommands)[number][],
) {
  for (const section of commands) {
    await test.step(`${section.testId} scrolls to the expected section`, async () => {
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))
      await runPaletteCommand(page, section.testId)
      await waitForSectionNearTop(page, section.selector)
    })
  }
}

test.beforeEach(async ({ page, baseURL }) => {
  await prepareDashboard(page, baseURL)
})

test('renders the full command palette command set for the seeded dataset', async ({ page }) => {
  const palette = await openPalette(page)
  const renderedCommandTestIds = await palette
    .locator('[data-testid^="command-"]')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute('data-testid'))
        .filter((value): value is string => typeof value === 'string')
        .sort(),
    )

  expect(renderedCommandTestIds).toEqual(expectedCommandTestIds)
})

test('executes action commands from the command palette', async ({ page }) => {
  await mockAutoImportStream(page)
  const pdfReport = await mockPdfReport(page)

  await test.step('auto import opens and completes through the command palette', async () => {
    await runPaletteCommand(page, 'command-auto-import')

    const dialog = page.getByRole('dialog', { name: autoImportDialogTitlePattern })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/5 days imported|5 Tage importiert/)).toBeVisible()
    await dialog.getByRole('button', { name: closeButtonPattern }).last().click()
    await expect(dialog).toBeHidden()
  })

  await test.step('settings command is searchable through aliases and opens the dialog', async () => {
    const palette = await openPalette(page)
    await palette.locator('input').fill('einstellungen offnen')
    const settingsCommand = palette.locator('[data-testid="command-settings-open"]')
    await expect(settingsCommand).toBeVisible()
    await settingsCommand.click()
    await expect(palette).toBeHidden()

    const dialog = page.getByRole('dialog', { name: settingsDialogTitlePattern })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  await test.step('upload command opens the file chooser', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    const { palette, command } = await getPaletteCommand(page, 'command-upload')
    await command.click()
    await fileChooserPromise
    await expect(palette).toBeHidden()
  })

  await test.step('CSV export command downloads the current dataset', async () => {
    const downloadPromise = page.waitForEvent('download')
    await runPaletteCommand(page, 'command-csv')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^ttdash-export-\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = await readDownloadText(download)
    expect(csv).toContain('"date","totalCost","totalTokens"')
    expect(csv).toContain('GPT-5.4')
  })

  await test.step('PDF report command requests the report and downloads a PDF', async () => {
    const downloadPromise = page.waitForEvent('download')
    await runPaletteCommand(page, 'command-report')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^ttdash-report-\d{4}-\d{2}-\d{2}\.pdf$/)
    const pdf = await readDownloadText(download)
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    await expect.poll(() => pdfReport.getReportRequest()?.language).toBe('de')
  })

  await test.step('delete command clears the local dataset', async () => {
    await runPaletteCommand(page, 'command-delete')

    await expect(page.getByRole('button', { name: autoImportButtonPattern })).toBeVisible()
    await expect(page.getByRole('button', { name: uploadFileButtonPattern })).toBeVisible()
    await expect(page.locator('#token-analysis')).toHaveCount(0)
  })
})

test('executes filter and view commands from the command palette', async ({ page }) => {
  const filters = page.locator('#filters')
  const openAiFilter = filters.getByRole('button', { name: 'OpenAI', exact: true })
  const gptFilter = filters.getByRole('button', { name: 'GPT-5.4', exact: true })

  await test.step('view commands switch between daily, monthly, and yearly modes', async () => {
    await runPaletteCommand(page, 'command-view-monthly')
    await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
      monthlyViewPattern,
    )

    await runPaletteCommand(page, 'command-view-yearly')
    await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
      yearlyViewPattern,
    )

    await runPaletteCommand(page, 'command-view-daily')
    await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
      dailyViewPattern,
    )
  })

  await test.step('preset commands apply date ranges', async () => {
    await runPaletteCommand(page, 'command-preset-7d')
    await expect(filters.getByRole('button', { name: preset7Pattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(filters.getByText(dateFilterActivePattern)).toBeVisible()

    await runPaletteCommand(page, 'command-preset-30d')
    await expect(filters.getByRole('button', { name: preset30Pattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await runPaletteCommand(page, 'command-preset-month')
    await expect(filters.getByRole('button', { name: presetMonthPattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await runPaletteCommand(page, 'command-preset-year')
    await expect(filters.getByRole('button', { name: presetYearPattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await runPaletteCommand(page, 'command-preset-all')
    await expect(filters.getByRole('button', { name: presetAllPattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(filters.getByText(dateFilterActivePattern)).toHaveCount(0)
  })

  await test.step('clear and reset commands restore default filter state', async () => {
    await openAiFilter.click()
    await gptFilter.click()
    await runPaletteCommand(page, 'command-preset-7d')

    await expect(filters.getByText(providersActivePattern)).toBeVisible()
    await expect(filters.getByText(modelsActivePattern)).toBeVisible()
    await expect(filters.getByText(dateFilterActivePattern)).toBeVisible()

    await runPaletteCommand(page, 'command-clear-providers')
    await expect(openAiFilter).toHaveAttribute('aria-pressed', 'false')
    await expect(filters.getByText(providersActivePattern)).toHaveCount(0)

    await runPaletteCommand(page, 'command-clear-models')
    await expect(gptFilter).toHaveAttribute('aria-pressed', 'false')
    await expect(filters.getByText(modelsActivePattern)).toHaveCount(0)

    await runPaletteCommand(page, 'command-clear-dates')
    await expect(filters.getByText(dateFilterActivePattern)).toHaveCount(0)
    await expect(filters.getByRole('button', { name: presetAllPattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await openAiFilter.click()
    await gptFilter.click()
    await runPaletteCommand(page, 'command-view-monthly')
    await runPaletteCommand(page, 'command-preset-30d')
    await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
      monthlyViewPattern,
    )

    await runPaletteCommand(page, 'command-reset-all')
    await expect(filters.getByRole('combobox', { name: viewModeComboboxPattern })).toContainText(
      dailyViewPattern,
    )
    await expect(openAiFilter).toHaveAttribute('aria-pressed', 'false')
    await expect(gptFilter).toHaveAttribute('aria-pressed', 'false')
    await expect(filters.getByText(providersActivePattern)).toHaveCount(0)
    await expect(filters.getByText(modelsActivePattern)).toHaveCount(0)
    await expect(filters.getByText(dateFilterActivePattern)).toHaveCount(0)
    await expect(filters.getByRole('button', { name: presetAllPattern })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test('executes dynamic provider and model commands from the command palette', async ({ page }) => {
  const filters = page.locator('#filters')

  for (const provider of providerLabels) {
    await test.step(`provider command toggles ${provider}`, async () => {
      const providerButton = filters.getByRole('button', { name: provider, exact: true })

      await runPaletteCommand(page, `command-provider-${provider}`)
      await expect(providerButton).toHaveAttribute('aria-pressed', 'true')

      await runPaletteCommand(page, `command-provider-${provider}`)
      await expect(providerButton).toHaveAttribute('aria-pressed', 'false')
    })
  }

  for (const model of modelLabels) {
    await test.step(`model command toggles ${model}`, async () => {
      const modelButton = filters.getByRole('button', { name: model, exact: true })

      await runPaletteCommand(page, `command-model-${model}`)
      await expect(modelButton).toHaveAttribute('aria-pressed', 'true')

      await runPaletteCommand(page, `command-model-${model}`)
      await expect(modelButton).toHaveAttribute('aria-pressed', 'false')
    })
  }
})

test('executes scroll and filter navigation commands from the command palette', async ({
  page,
}) => {
  await test.step('scroll commands reach the bottom and top of the dashboard', async () => {
    await runPaletteCommand(page, 'command-bottom')
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(400)

    await runPaletteCommand(page, 'command-top')
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(40)
  })

  await test.step('filters command scrolls to the filter bar', async () => {
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))
    await runPaletteCommand(page, 'command-filters')
    await waitForSectionNearTop(page, '#filters')
  })
})

test('executes dashboard section navigation commands from the command palette', async ({
  page,
}) => {
  const dashboardCommands = sectionCommands.slice(0, 7)

  await runSectionNavigationCommands(page, dashboardCommands)
  await expect(page.locator(dashboardCommands.at(-1)!.selector)).toBeVisible()
})

test('executes analysis section navigation commands from the command palette', async ({ page }) => {
  const analysisCommands = sectionCommands.slice(7)

  await runSectionNavigationCommands(page, analysisCommands)
  await expect(page.locator(analysisCommands.at(-1)!.selector)).toBeVisible()
})

test('executes theme, language, help, and quick-select interactions from the command palette', async ({
  page,
}) => {
  await test.step('theme command toggles the document theme', async () => {
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    await runPaletteCommand(page, 'command-theme')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(!wasDark)
  })

  await test.step('quick-select runs the English language command from search result #1', async () => {
    const palette = await openPalette(page)
    await palette.locator('input').fill('english')
    await expect(palette.locator('[data-testid="command-language-en"]')).toBeVisible()
    await page.keyboard.press('1')
    await expect(palette).toBeHidden()
    await expect(page.locator('#filters').getByText('Filter status')).toBeVisible()
  })

  await test.step('German language command switches the UI back to German', async () => {
    await runPaletteCommand(page, 'command-language-de')
    await expect(page.locator('#filters').getByText('Filterstatus')).toBeVisible()
  })

  await test.step('help command opens the help panel', async () => {
    await runPaletteCommand(page, 'command-help')

    const dialog = page.getByRole('dialog', { name: helpDialogTitlePattern })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
