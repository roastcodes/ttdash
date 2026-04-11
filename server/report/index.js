const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { buildReportData, formatDateAxis } = require('./utils');
const { horizontalBarChart, lineChart, stackedBarChart } = require('./charts');

function ensureTypstInstalled() {
  return new Promise((resolve) => {
    const child = spawn('typst', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

function writeTextFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
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
      reject(new Error(stderr.trim() || 'Typst compilation failed.'));
    });
  });
}

function buildTemplate() {
  return `
#let report = json("report.json")

#set page(
  paper: "a4",
  margin: (x: 14mm, y: 16mm),
  fill: rgb("#f3f6f9"),
)

#set text(font: "Arial", lang: if report.meta.language == "en" { "en" } else { "de" })
#set par(justify: false, leading: 0.55em)

#let ink = rgb("#102132")
#let muted = rgb("#5c6b7e")
#let panel = rgb("#ffffff")
#let line = rgb("#d9e2ec")
#let accent = rgb("#1d6fd8")
#let accent-soft = rgb("#eaf2ff")
#let good = rgb("#16825d")
#let warn = rgb("#c67700")

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
    #text(size: 9pt, fill: accent, weight: "bold")[TTDash PDF Report]
    #v(6pt)
    #text(size: 26pt, fill: ink, weight: "bold")[#report.meta.reportTitle]
    #v(4pt)
    #text(size: 10pt, fill: muted)[#report.labels.dateRangeText]
    #v(10pt)
    #grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 8pt,
      metric-card(if report.meta.language == "en" { "Date range" } else { "Zeitraum" }, report.labels.dateRangeText),
      metric-card(if report.meta.language == "en" { "View" } else { "Ansicht" }, report.meta.filterSummary.viewMode),
      metric-card(if report.meta.language == "en" { "Generated" } else { "Generiert" }, report.meta.generatedAtLabel),
    )
  ]
]

#v(10pt)

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  ..report.summaryCards.map(card => metric-card(card.label, card.value, note: card.note, tone: if card.tone == "warn" { warn } else if card.tone == "good" { good } else { accent })),
)

#v(12pt)

= #if report.meta.language == "en" { "Overview" } else { "Überblick" }

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
    #image("cost-trend.svg", width: 100%)
  ],
  rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
    #image("top-models.svg", width: 100%)
  ],
)

#v(10pt)

#rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
  #image("token-trend.svg", width: 100%)
]

#v(12pt)

= #if report.meta.language == "en" { "Filters" } else { "Filter" }

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 8pt,
  metric-card(if report.meta.language == "en" { "Month" } else { "Monat" }, if report.meta.filterSummary.selectedMonthLabel != none { report.meta.filterSummary.selectedMonthLabel } else { if report.meta.language == "en" { "All" } else { "Alle" } }),
  metric-card(if report.meta.language == "en" { "Selected providers" } else { "Ausgewählte Provider" }, if report.meta.filterSummary.selectedProviders.len() > 0 { report.meta.filterSummary.selectedProviders.join(", ") } else { if report.meta.language == "en" { "All" } else { "Alle" } }),
  metric-card(if report.meta.language == "en" { "Selected models" } else { "Ausgewählte Modelle" }, if report.meta.filterSummary.selectedModels.len() > 0 { report.meta.filterSummary.selectedModels.join(", ") } else { if report.meta.language == "en" { "All" } else { "Alle" } }),
  metric-card(if report.meta.language == "en" { "Start date" } else { "Startdatum" }, if report.meta.filterSummary.startDateLabel != none { report.meta.filterSummary.startDateLabel } else { if report.meta.language == "en" { "No filter" } else { "Kein Filter" } }),
  metric-card(if report.meta.language == "en" { "End date" } else { "Enddatum" }, if report.meta.filterSummary.endDateLabel != none { report.meta.filterSummary.endDateLabel } else { if report.meta.language == "en" { "No filter" } else { "Kein Filter" } }),
)

#v(10pt)

= #if report.meta.language == "en" { "Models & Providers" } else { "Modelle & Provider" }

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
    #text(size: 12pt, weight: "bold", fill: ink)[#if report.meta.language == "en" { "Top models" } else { "Top-Modelle" }]
    #v(6pt)
    #set text(size: 8.8pt)
    #table(
      columns: (2.5fr, 1.5fr, 1fr, 1fr),
      column-gutter: 8pt,
      align: (x, y) => if x < 2 { left } else { right },
      table.header([*#if report.meta.language == "en" { "Model" } else { "Modell" }*], [*Provider*], [*#if report.meta.language == "en" { "Cost" } else { "Kosten" }*], [*Requests*]),
      ..report.topModels.map(model => (
        [#model.name],
        [#model.provider],
        [#model.costLabel],
        [#model.requestsLabel],
      )).flatten(),
    )
  ],
  rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
    #text(size: 12pt, weight: "bold", fill: ink)[#if report.meta.language == "en" { "Providers" } else { "Provider" }]
    #v(6pt)
    #set text(size: 8.8pt)
    #table(
      columns: (1.8fr, 1fr, 1fr, 1fr),
      column-gutter: 8pt,
      align: (x, y) => if x == 0 { left } else { right },
      table.header([*Provider*], [*#if report.meta.language == "en" { "Cost" } else { "Kosten" }*], [*Tokens*], [*Requests*]),
      ..report.providers.map(provider => (
        [#provider.name],
        [#provider.costLabel],
        [#provider.tokensLabel],
        [#provider.requestsLabel],
      )).flatten(),
    )
  ],
)

#pagebreak()

= #if report.meta.language == "en" { "Recent periods" } else { "Letzte Zeiträume" }

#rect(inset: 10pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
  #set text(size: 8.9pt)
  #table(
    columns: (2fr, 1fr, 1fr, 1fr),
    column-gutter: 8pt,
    align: (x, y) => if x == 0 { left } else { right },
    table.header([*#if report.meta.language == "en" { "Period" } else { "Zeitraum" }*], [*#if report.meta.language == "en" { "Cost" } else { "Kosten" }*], [*Tokens*], [*Requests*]),
    ..report.recentPeriods.map(item => (
      [#item.label],
      [#item.costLabel],
      [#item.tokensLabel],
      [#item.requestsLabel],
    )).flatten(),
  )
]

#v(12pt)

= #if report.meta.language == "en" { "Interpretation" } else { "Interpretation" }

#rect(inset: 12pt, radius: 14pt, fill: panel, stroke: (paint: line, thickness: 0.8pt))[
  #text(size: 10pt, fill: ink)[
    #if report.meta.language == "en" [
      This report is based on #report.meta.days daily raw entries and #report.meta.periods aggregated periods.
      The highest-cost period is #report.labels.topDay.
      The dominant model family is #report.labels.topModel, and the leading provider is #report.labels.topProvider.
    ] else [
      Der Report basiert auf #report.meta.days täglichen Rohdaten und #report.meta.periods aggregierten Perioden.
      Der kostenstärkste Zeitraum liegt bei #report.labels.topDay.
      Die dominanteste Modellfamilie ist #report.labels.topModel, der führende Provider ist #report.labels.topProvider.
    ]
  ]
  #v(8pt)
  #text(size: 9pt, fill: muted)[
    #if report.meta.language == "en" [
      Created with TTDash v#report.meta.appVersion and server-side Typst compilation.
    ] else [
      Erstellt mit TTDash v#report.meta.appVersion und serverseitiger Typst-Kompilierung.
    ]
  ]
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
      title: reportData.meta.language === 'en' ? 'Cost trend' : 'Kostenverlauf',
      valueKey: 'cost',
      secondaryKey: reportData.meta.filterSummary.viewMode === 'daily' ? 'ma7' : null,
      formatter: (value) => `$${Math.round(value)}`,
    }),
    'top-models.svg': horizontalBarChart(topModels, {
      title: reportData.meta.language === 'en' ? 'Top models by cost' : 'Top-Modelle nach Kosten',
      getValue: (entry) => entry.cost,
      getLabel: (entry) => entry.name,
      getColor: (entry) => entry.color,
      formatter: (value) => `$${value.toFixed(value >= 100 ? 0 : 2)}`,
    }),
    'token-trend.svg': stackedBarChart(tokenTrend, {
      title: reportData.meta.language === 'en' ? 'Token mix by period' : 'Token-Mix pro Zeitraum',
      segments: [
        { key: 'input', label: 'Input', color: '#0f766e' },
        { key: 'output', label: 'Output', color: '#1d4ed8' },
        { key: 'cacheWrite', label: 'Cache Write', color: '#b45309' },
        { key: 'cacheRead', label: 'Cache Read', color: '#7c3aed' },
        { key: 'thinking', label: 'Thinking', color: '#be185d' },
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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttdash-report-'));
  const typPath = path.join(tempDir, 'report.typ');
  const pdfPath = path.join(tempDir, 'report.pdf');
  const jsonPath = path.join(tempDir, 'report.json');

  writeTextFile(typPath, buildTemplate());
  writeTextFile(jsonPath, JSON.stringify(reportData, null, 2));

  const charts = createChartAssets(reportData);
  for (const [filename, content] of Object.entries(charts)) {
    writeTextFile(path.join(tempDir, filename), content);
  }

  await compileTypst(tempDir, typPath, pdfPath);

  return {
    pdfPath,
    tempDir,
    filename: `ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    reportData,
  };
}

module.exports = {
  generatePdfReport,
};
