#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_JUNIT_PATH = path.join(ROOT, 'test-results', 'vitest-timings.junit.xml');
const DEFAULT_WARN_SUITE_SECONDS = 2;
const DEFAULT_WARN_TEST_SECONDS = 0.5;

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

function parsePositiveNumber(value, optionName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive number.`);
  }

  return parsed;
}

function parseArgs(argv) {
  const options = {
    junitPath: DEFAULT_JUNIT_PATH,
    maxSuiteSeconds: null,
    maxTestSeconds: null,
    warnSuiteSeconds: DEFAULT_WARN_SUITE_SECONDS,
    warnTestSeconds: DEFAULT_WARN_TEST_SECONDS,
  };
  let positionalPath = null;

  for (const arg of argv) {
    if (arg.startsWith('--max-suite-seconds=')) {
      options.maxSuiteSeconds = parsePositiveNumber(
        arg.slice('--max-suite-seconds='.length),
        '--max-suite-seconds',
      );
    } else if (arg.startsWith('--max-test-seconds=')) {
      options.maxTestSeconds = parsePositiveNumber(
        arg.slice('--max-test-seconds='.length),
        '--max-test-seconds',
      );
    } else if (arg.startsWith('--warn-suite-seconds=')) {
      options.warnSuiteSeconds = parsePositiveNumber(
        arg.slice('--warn-suite-seconds='.length),
        '--warn-suite-seconds',
      );
    } else if (arg.startsWith('--warn-test-seconds=')) {
      options.warnTestSeconds = parsePositiveNumber(
        arg.slice('--warn-test-seconds='.length),
        '--warn-test-seconds',
      );
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!positionalPath) {
      positionalPath = path.resolve(process.cwd(), arg);
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (positionalPath) {
    options.junitPath = positionalPath;
  }

  return options;
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

function filterTimedRows(rows, threshold) {
  if (threshold === null || threshold === undefined) {
    return [];
  }

  return rows
    .filter((row) => Number.isFinite(row.time) && row.time > threshold)
    .sort((left, right) => right.time - left.time);
}

function buildTimingReport(junit, options = {}) {
  const slowSuites = junit.suites
    .filter((suite) => Number.isFinite(suite.time))
    .sort((left, right) => right.time - left.time)
    .slice(0, 10);

  const slowCases = junit.cases
    .filter((testCase) => Number.isFinite(testCase.time))
    .sort((left, right) => right.time - left.time)
    .slice(0, 15);

  return {
    slowSuites,
    slowCases,
    suiteWarnings: filterTimedRows(junit.suites, options.warnSuiteSeconds),
    testWarnings: filterTimedRows(junit.cases, options.warnTestSeconds),
    suiteFailures: filterTimedRows(junit.suites, options.maxSuiteSeconds),
    testFailures: filterTimedRows(junit.cases, options.maxTestSeconds),
  };
}

function printBudgetRows(title, rows, formatRow) {
  if (rows.length === 0) {
    return;
  }

  printRanking(title, rows, formatRow);
}

function printUsage(stdout) {
  stdout.write(`Usage: node scripts/report-test-timings.js [junit-file] [options]

Options:
  --warn-suite-seconds=N  Print suites slower than N seconds. Default: ${DEFAULT_WARN_SUITE_SECONDS}
  --warn-test-seconds=N   Print tests slower than N seconds. Default: ${DEFAULT_WARN_TEST_SECONDS}
  --max-suite-seconds=N   Fail when any suite is slower than N seconds.
  --max-test-seconds=N    Fail when any test is slower than N seconds.
`);
}

function run(argv = process.argv.slice(2), streams = process) {
  let options;

  try {
    options = parseArgs(argv);
  } catch (error) {
    streams.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (options.help) {
    printUsage(streams.stdout);
    return 0;
  }

  if (!fs.existsSync(options.junitPath)) {
    streams.stderr.write(`JUnit report not found: ${options.junitPath}\n`);
    streams.stderr.write('Run vitest with the junit reporter first.\n');
    return 1;
  }

  const xml = fs.readFileSync(options.junitPath, 'utf8');
  const report = buildTimingReport(parseJUnit(xml), options);

  printRanking('Slowest suites', report.slowSuites, (suite) => {
    return `${formatSeconds(suite.time)} | ${suite.name}`;
  });

  printRanking('Slowest tests', report.slowCases, (testCase) => {
    return `${formatSeconds(testCase.time)} | ${testCase.suite} | ${testCase.name}`;
  });

  printBudgetRows('Suites over warning budget', report.suiteWarnings, (suite) => {
    return `${formatSeconds(suite.time)} | ${suite.name}`;
  });

  printBudgetRows('Tests over warning budget', report.testWarnings, (testCase) => {
    return `${formatSeconds(testCase.time)} | ${testCase.suite} | ${testCase.name}`;
  });

  printBudgetRows('Suites over hard budget', report.suiteFailures, (suite) => {
    return `${formatSeconds(suite.time)} | ${suite.name}`;
  });

  printBudgetRows('Tests over hard budget', report.testFailures, (testCase) => {
    return `${formatSeconds(testCase.time)} | ${testCase.suite} | ${testCase.name}`;
  });

  if (report.suiteFailures.length > 0 || report.testFailures.length > 0) {
    streams.stderr.write('Test timing budget exceeded.\n');
    return 1;
  }

  return 0;
}

function main() {
  process.exitCode = run();
}

if (require.main === module) {
  main();
}

module.exports = {
  buildTimingReport,
  parseArgs,
  parseJUnit,
  run,
};
