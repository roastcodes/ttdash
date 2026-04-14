const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { buildReportData, formatCompactAxis, formatDateAxis } = require('./utils');
const { getLocale, translate } = require('./i18n');
const { horizontalBarChart, lineChart, stackedBarChart } = require('./charts');

function ensureTypstInstalled() {
  return new Promise((resolve) => {
    const child = spawn('typst', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function writeTextFile(filePath, content) {
  await fsPromises.writeFile(filePath, content, 'utf8');
}

function compileTypst(workingDir, typPath, pdfPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('typst', ['compile', typPath, pdfPath, '--root', workingDir], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Typst compilation failed: ${stderr.trim() || 'unknown error'}`));
    });
  });
}

function formatCostAxisValue(value, language = 'de') {
  const numericValue = Number(value) || 0;
  const absoluteValue = Math.abs(numericValue);
  const locale = getLocale(language);

  if (absoluteValue >= 100) {
    return `$${Math.round(numericValue).toLocaleString(locale)}`;
  }

  if (absoluteValue >= 10) {
    return `$${numericValue.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}`;
  }

  if (absoluteValue >= 1) {
    return `$${numericValue.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${numericValue.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildTemplate() {
  return `
#let report = json("report.json")

#set document(title: report.meta.reportTitle)

#set page(
  paper: "a4",
  margin: (x: 14mm, y: 16mm),
  fill: rgb("#f3f6f9"),
)

#set text(font: ("Liberation Sans", "DejaVu Sans", "Arial"), lang: if report.meta.language == "en" { "en" } else { "de" })
#set par(justify: false, leading: 0.55em)

#let ink = rgb("#102132")
#let muted = rgb("#5c6b7e")
#let panel = rgb("#ffffff")
#let line = rgb("#d9e2ec")
#let accent = rgb("#175fc0")
#let accent-soft = rgb("#eaf2ff")
#let good = rgb("#16825d")
#let warn = rgb("#9a5a00")

#let metric-card(label, value, note: none, tone: accent) = rect(
  inset: 10pt,
  radius: 14pt,
  fill: panel,
  stroke: (paint: line, thickness: 0.8pt),
  [
    #text(size: 9pt, fill: muted, weight: "medium")[#label]
    #v(3pt)
    #text(size: 17pt, fill: ink, weight: "bold")[#value]
    #if note != none [
      #v(3pt)
      #text(size: 8.5pt, fill: tone)[#note]
    ]
  ],
)

#let insight-card(title, body, tone: accent) = rect(
  inset: 11pt,
  radius: 14pt,
  fill: panel,
  stroke: (paint: line, thickness: 0.8pt),
  [
    #text(size: 9pt, fill: tone, weight: "bold")[#title]
    #v(4pt)
    #text(size: 9.6pt, fill: ink)[#body]
  ],
)

#let chart-panel(file, alt, summary, note: none) = rect(
  inset: 10pt,
  radius: 14pt,
  fill: panel,
  stroke: (paint: line, thickness: 0.8pt),
  [
    #image(file, width: 100%, alt: alt)
    #v(6pt)
    #text(size: 8.7pt, fill: muted)[#summary]
    #if note != none [
      #v(4pt)
      #text(size: 8.5pt, fill: muted)[#note]
    ]
  ],
)

#show heading.where(level: 1): it => block(above: 0pt, below: 10pt)[
  #text(size: 24pt, fill: ink, weight: "bold")[#it.body]
]

#show heading.where(level: 2): it => block(above: 8pt, below: 8pt)[
  #text(size: 14pt, fill: ink, weight: "bold")[#it.body]
]

#set table(
  stroke: (x, y) => if y == 0 { (bottom: 1pt + line) } else { (bottom: 0.6pt + line) },
  inset: (x: 6pt, y: 5pt),
)

#box(fill: rgb("#f0f6ff"), inset: 16pt, radius: 18pt, width: 100%)[
  #align(left)[
    #text(size: 9pt, fill: accent, weight: "bold")[#report.text.headerEyebrow]
    #v(6pt)
    #text(size: 26pt, fill: ink, weight: "bold")[#report.meta.reportTitle]
    #v(4pt)
    #text(size: 10pt, fill: muted)[#report.labels.dateRangeText]
    #v(10pt)
    #grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 8pt,
      metric-card(report.text.fields.dateRange, report.labels.dateRangeText),
      metric-card(report.text.fields.view, report.meta.filterSummary.viewMode),
      metric-card(report.text.fields.generated, report.meta.generatedAtLabel),
    )
  ]
]

#v(10pt)

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  ..report.summaryCards.map(card => metric-card(card.label, card.value, note: card.note, tone: if card.tone == "warn" { warn } else if card.tone == "good" { good } else { accent })),
)

#if report.insights.items.len() > 0 [
  #v(12pt)
  = #report.text.sections.insights

  #grid(
    columns: (1fr, 1fr),
    gutter: 8pt,
    ..report.insights.items.map(item => insight-card(
      item.title,
      item.body,
      tone: if item.tone == "warn" { warn } else if item.tone == "good" { good } else { accent },
    )),
  )
]

#v(12pt)

= #report.text.sections.overview

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  chart-panel(
    "cost-trend.svg",
    report.chartDescriptions.costTrend.alt,
    report.chartDescriptions.costTrend.summary,
  ),
  chart-panel(
    "top-models.svg",
    report.chartDescriptions.topModels.alt,
    report.chartDescriptions.topModels.summary,
    note: report.chartDescriptions.topModels.fullNamesNote,
  ),
)

#v(10pt)

#chart-panel(
  "token-trend.svg",
  report.chartDescriptions.tokenTrend.alt,
  report.chartDescriptions.tokenTrend.summary,
)

#v(12pt)

= #report.text.sections.filters

#grid(
  columns: (1fr, 1fr),
  gutter: 8pt,
  metric-card(report.text.fields.month, report.meta.filterSummary.selectedMonthLabel),
  metric-card(report.text.fields.selectedProviders, report.meta.filterSummary.selectedProvidersLabel),
  metric-card(report.text.fields.selectedModels, report.meta.filterSummary.selectedModelsLabel),
  metric-card(report.text.fields.startDate, report.meta.filterSummary.startDateLabel),
  metric-card(report.text.fields.endDate, report.meta.filterSummary.endDateLabel),
)

#v(10pt)

= #report.text.sections.modelsProviders

#if report.topModels.len() > 0 or report.providers.len() > 0 [
  #grid(
    columns: (1fr, 1fr),
    gutter: 10pt,
    rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
      #text(size: 12pt, weight: "bold", fill: ink)[#report.text.tables.topModels]
      #v(6pt)
      #set text(size: 8.8pt)
      #table(
        columns: (2.2fr, 1.4fr, 1fr, 0.9fr),
        column-gutter: 8pt,
        align: (x, y) => if x < 2 { left } else { right },
        table.header([*#report.text.tables.columns.model*], [*#report.text.tables.columns.provider*], [*#report.text.tables.columns.cost*], [*#report.text.tables.columns.requests*]),
        ..report.topModels.map(model => (
          [#model.name],
          [#model.provider],
          [#model.costLabel],
          [#model.requestsLabel],
        )).flatten(),
      )
    ],
    rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
      #text(size: 12pt, weight: "bold", fill: ink)[#report.text.tables.providers]
      #v(6pt)
      #set text(size: 8.8pt)
      #table(
        columns: (1.8fr, 1fr, 1fr, 1fr),
        column-gutter: 8pt,
        align: (x, y) => if x == 0 { left } else { right },
        table.header([*#report.text.tables.columns.provider*], [*#report.text.tables.columns.cost*], [*#report.text.tables.columns.tokens*], [*#report.text.tables.columns.requests*]),
        ..report.providers.map(provider => (
          [#provider.name],
          [#provider.costLabel],
          [#provider.tokensLabel],
          [#provider.requestsLabel],
        )).flatten(),
      )
    ],
  )
]

#if report.recentPeriods.len() > 0 [
  = #report.text.sections.recentPeriods

  #rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
    #set text(size: 8.9pt)
    #table(
      columns: (2fr, 1fr, 1fr, 1fr),
      column-gutter: 8pt,
      align: (x, y) => if x == 0 { left } else { right },
      table.header([*#report.text.tables.columns.period*], [*#report.text.tables.columns.cost*], [*#report.text.tables.columns.tokens*], [*#report.text.tables.columns.requests*]),
      ..report.recentPeriods.map(item => (
        [#item.label],
        [#item.costLabel],
        [#item.tokensLabel],
        [#item.requestsLabel],
      )).flatten(),
    )
  ]
]

#v(12pt)

= #report.text.sections.interpretation

#rect(inset: 12pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
  #text(size: 10pt, fill: ink)[#report.interpretation.summary]
  #v(8pt)
  #text(size: 9pt, fill: muted)[#report.interpretation.footer]
]
`;
}

function createChartAssets(reportData) {
  const costTrend = reportData.charts.costTrend.map((entry) => ({
    label: formatDateAxis(entry.date, reportData.meta.language),
    cost: entry.cost,
    ma7: entry.ma7 || 0,
  }));

  const topModels = reportData.topModels.slice(0, 8);
  const tokenTrend = reportData.charts.tokenTrend.map((entry) => ({
    label: formatDateAxis(entry.date, reportData.meta.language),
    input: entry.input,
    output: entry.output,
    cacheWrite: entry.cacheWrite,
    cacheRead: entry.cacheRead,
    thinking: entry.thinking,
  }));

  return {
    'cost-trend.svg': lineChart(costTrend, {
      title: reportData.text.charts.costTrend,
      valueKey: 'cost',
      secondaryKey: reportData.meta.filterSummary.viewModeKey === 'daily' ? 'ma7' : null,
      formatter: (value) => formatCostAxisValue(value, reportData.meta.language),
    }),
    'top-models.svg': horizontalBarChart(topModels, {
      title: reportData.text.charts.topModels,
      getValue: (entry) => entry.cost,
      getLabel: (entry) => entry.name,
      getColor: (entry) => entry.color,
      formatter: (value) => formatCostAxisValue(value, reportData.meta.language),
    }),
    'token-trend.svg': stackedBarChart(tokenTrend, {
      title: reportData.text.charts.tokenTrend,
      formatter: (value) => formatCompactAxis(value, reportData.meta.language),
      segments: [
        {
          key: 'input',
          label: translate(reportData.meta.language, 'common.input'),
          color: '#0f766e',
        },
        {
          key: 'output',
          label: translate(reportData.meta.language, 'common.output'),
          color: '#1d4ed8',
        },
        {
          key: 'cacheWrite',
          label: translate(reportData.meta.language, 'common.cacheWrite'),
          color: '#b45309',
        },
        {
          key: 'cacheRead',
          label: translate(reportData.meta.language, 'common.cacheRead'),
          color: '#7c3aed',
        },
        {
          key: 'thinking',
          label: translate(reportData.meta.language, 'common.thinking'),
          color: '#be185d',
        },
      ],
    }),
  };
}

async function generatePdfReport(allDailyData, options = {}) {
  const typstInstalled = await ensureTypstInstalled();
  if (!typstInstalled) {
    const error = new Error('Typst CLI not found. On macOS install it with: brew install typst');
    error.code = 'TYPST_MISSING';
    throw error;
  }

  const reportData = buildReportData(allDailyData, options);
  if (!reportData.meta.days || !reportData.meta.periods) {
    throw new Error('No data available for the report.');
  }

  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'ttdash-report-'));
  const typPath = path.join(tempDir, 'report.typ');
  const pdfPath = path.join(tempDir, 'report.pdf');
  const jsonPath = path.join(tempDir, 'report.json');

  try {
    await writeTextFile(typPath, buildTemplate());
    await writeTextFile(jsonPath, JSON.stringify(reportData, null, 2));

    const charts = createChartAssets(reportData);
    await Promise.all(
      Object.entries(charts).map(([filename, content]) =>
        writeTextFile(path.join(tempDir, filename), content),
      ),
    );

    await compileTypst(tempDir, typPath, pdfPath);

    return {
      buffer: await fsPromises.readFile(pdfPath),
      filename: `ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      reportData,
    };
  } finally {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  generatePdfReport,
  __test__: {
    buildTemplate,
    createChartAssets,
    formatCostAxisValue,
  },
};
