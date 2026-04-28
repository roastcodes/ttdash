#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_JUNIT_PATH = path.join(ROOT, 'test-results', 'vitest-timings.junit.xml');

function parseAttributes(tag) {
  const attributes = {};

  for (const match of tag.matchAll(/(\w+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function parseJUnit(xml) {
  const suites = [];
  const cases = [];

  for (const match of xml.matchAll(/<testsuite\b([^>]*)>/g)) {
    const attributes = parseAttributes(match[1]);
    suites.push({
      name: attributes.name || '(unnamed suite)',
      time: Number(attributes.time || 0),
    });
  }

  for (const match of xml.matchAll(/<testcase\b([^>]*)>/g)) {
    const attributes = parseAttributes(match[1]);
    cases.push({
      suite: attributes.classname || '(unknown suite)',
      name: attributes.name || '(unnamed test)',
      time: Number(attributes.time || 0),
    });
  }

  return { suites, cases };
}

function formatSeconds(value) {
  return `${value.toFixed(3)}s`;
}

function printRanking(title, rows, formatRow) {
  process.stdout.write(`${title}\n`);

  if (rows.length === 0) {
    process.stdout.write('  no entries\n\n');
    return;
  }

  for (const row of rows) {
    process.stdout.write(`  ${formatRow(row)}\n`);
  }

  process.stdout.write('\n');
}

function main() {
  const junitPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_JUNIT_PATH;

  if (!fs.existsSync(junitPath)) {
    process.stderr.write(`JUnit report not found: ${junitPath}\n`);
    process.stderr.write('Run vitest with the junit reporter first.\n');
    process.exitCode = 1;
    return;
  }

  const xml = fs.readFileSync(junitPath, 'utf8');
  const { suites, cases } = parseJUnit(xml);

  const slowSuites = suites
    .filter((suite) => Number.isFinite(suite.time))
    .sort((left, right) => right.time - left.time)
    .slice(0, 10);

  const slowCases = cases
    .filter((testCase) => Number.isFinite(testCase.time))
    .sort((left, right) => right.time - left.time)
    .slice(0, 15);

  printRanking('Slowest suites', slowSuites, (suite) => {
    return `${formatSeconds(suite.time)} | ${suite.name}`;
  });

  printRanking('Slowest tests', slowCases, (testCase) => {
    return `${formatSeconds(testCase.time)} | ${testCase.suite} | ${testCase.name}`;
  });
}

main();
