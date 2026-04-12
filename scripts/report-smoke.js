#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { generatePdfReport } = require('../server/report');
const { buildReportData } = require('../server/report/utils');

const root = path.resolve(__dirname, '..');
const fixturePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(root, 'examples', 'sample-usage.json');
const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8')).daily;
const outDir = path.join('/tmp', 'ttdash-report-matrix');

fs.mkdirSync(outDir, { recursive: true });

const cases = [
  { name: 'daily-all-de', viewMode: 'daily', language: 'de', selectedMonth: null, selectedProviders: [], selectedModels: [] },
  { name: 'daily-all-en', viewMode: 'daily', language: 'en', selectedMonth: null, selectedProviders: [], selectedModels: [] },
  { name: 'monthly-all', viewMode: 'monthly', language: 'en', selectedMonth: null, selectedProviders: [], selectedModels: [] },
  { name: 'yearly-all', viewMode: 'yearly', language: 'de', selectedMonth: null, selectedProviders: [], selectedModels: [] },
  { name: 'daily-anthropic', viewMode: 'daily', selectedMonth: null, selectedProviders: ['Anthropic'], selectedModels: [] },
  { name: 'daily-openai', viewMode: 'daily', selectedMonth: null, selectedProviders: ['OpenAI'], selectedModels: [] },
  { name: 'daily-google', viewMode: 'daily', selectedMonth: null, selectedProviders: ['Google'], selectedModels: [] },
  { name: 'monthly-opus46', viewMode: 'monthly', selectedMonth: null, selectedProviders: [], selectedModels: ['Opus 4.6'] },
  { name: 'daily-gpt54', viewMode: 'daily', selectedMonth: null, selectedProviders: [], selectedModels: ['GPT-5.4'] },
  { name: 'daily-mar-2026', viewMode: 'daily', selectedMonth: '2026-03', selectedProviders: [], selectedModels: [] },
  { name: 'daily-last-week', viewMode: 'daily', selectedMonth: null, selectedProviders: [], selectedModels: [], startDate: '2026-03-28', endDate: '2026-04-03' },
  { name: 'monthly-mar-openai', viewMode: 'monthly', selectedMonth: '2026-03', selectedProviders: ['OpenAI'], selectedModels: [] },
  { name: 'yearly-anthropic-opus46', viewMode: 'yearly', selectedMonth: null, selectedProviders: ['Anthropic'], selectedModels: ['Opus 4.6'] },
];

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

async function main() {
  let failures = 0;

  for (const testCase of cases) {
    try {
      const reportData = buildReportData(data, testCase);
      if (!reportData.meta.days || !reportData.meta.periods) {
        console.log(`[skip] ${testCase.name}: no data after filters`);
        continue;
      }

      const { buffer, reportData: generated } = await generatePdfReport(data, testCase);
      const targetPdf = path.join(outDir, `${testCase.name}.pdf`);
      fs.writeFileSync(targetPdf, buffer);

      const info = execFileSync('pdfinfo', [targetPdf], { encoding: 'utf8' });
      const text = execFileSync('pdftotext', [targetPdf, '-'], { encoding: 'utf8' });
      if (!/Pages:\s+\d+/.test(info)) {
        throw new Error('pdfinfo output missing page count');
      }
      if (!text.includes(generated.meta.filterSummary.viewMode)) {
        throw new Error(`PDF text does not contain view mode ${generated.meta.filterSummary.viewMode}`);
      }
      if (!text.includes(generated.text.sections.overview)) {
        throw new Error(`PDF text does not contain overview heading ${generated.text.sections.overview}`);
      }
      if (!text.includes(generated.text.sections.interpretation)) {
        throw new Error(`PDF text does not contain interpretation heading ${generated.text.sections.interpretation}`);
      }
      if (!text.includes(generated.summaryCards[0].label)) {
        throw new Error(`PDF text does not contain summary label ${generated.summaryCards[0].label}`);
      }
      if (generated.insights.items.length > 0 && !text.includes(generated.text.sections.insights)) {
        throw new Error(`PDF text does not contain insights heading ${generated.text.sections.insights}`);
      }

      console.log(`[ok] ${testCase.name}: ${generated.meta.days} days, ${generated.meta.periods} periods`);
    } catch (error) {
      failures += 1;
      console.error(`[fail] ${testCase.name}: ${error.message}`);
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
}
