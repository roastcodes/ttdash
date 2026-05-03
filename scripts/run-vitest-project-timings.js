#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPORT_DIR = path.join(ROOT, 'test-results');
const DEFAULT_PROJECTS = [
  'architecture',
  'unit',
  'frontend',
  'integration',
  'integration-background',
];
const DEFAULT_MAX_SUITE_SECONDS = 20;
const DEFAULT_MAX_TEST_SECONDS = 12;

function parsePositiveInteger(value, optionName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
}

function parsePositiveNumber(value, optionName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive number.`);
  }

  return parsed;
}

function parseProjects(value) {
  const projects = value
    .split(',')
    .map((project) => project.trim())
    .filter(Boolean);

  if (projects.length === 0) {
    throw new Error('--projects must list at least one Vitest project.');
  }

  const unknownProjects = projects.filter((project) => !DEFAULT_PROJECTS.includes(project));

  if (unknownProjects.length > 0) {
    throw new Error(`Unknown Vitest project: ${unknownProjects.join(', ')}`);
  }

  return projects;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    help: false,
    maxSuiteSeconds: DEFAULT_MAX_SUITE_SECONDS,
    maxTestSeconds: DEFAULT_MAX_TEST_SECONDS,
    projects: DEFAULT_PROJECTS,
    repeat: 1,
    reportDir: DEFAULT_REPORT_DIR,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--max-suite-seconds=')) {
      options.maxSuiteSeconds = parsePositiveNumber(
        arg.slice('--max-suite-seconds='.length),
        '--max-suite-seconds',
      );
    } else if (arg.startsWith('--max-test-seconds=')) {
      options.maxTestSeconds = parsePositiveNumber(
        arg.slice('--max-test-seconds='.length),
        '--max-test-seconds',
      );
    } else if (arg.startsWith('--projects=')) {
      options.projects = parseProjects(arg.slice('--projects='.length));
    } else if (arg.startsWith('--repeat=')) {
      options.repeat = parsePositiveInteger(arg.slice('--repeat='.length), '--repeat');
    } else if (arg.startsWith('--report-dir=')) {
      options.reportDir = path.resolve(process.cwd(), arg.slice('--report-dir='.length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function getReportPath(project, iteration, repeat, reportDir) {
  const suffix = repeat === 1 ? 'timing' : `timing-run-${iteration}`;
  return path.join(reportDir, `vitest-${project}.${suffix}.junit.xml`);
}

function buildProjectRuns(options) {
  const runs = [];

  for (let iteration = 1; iteration <= options.repeat; iteration += 1) {
    for (const project of options.projects) {
      runs.push({
        iteration,
        project,
        reportPath: getReportPath(project, iteration, options.repeat, options.reportDir),
      });
    }
  }

  return runs;
}

function getNpxCommand(platform = process.platform) {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
}

function buildVitestCommand(run, platform = process.platform) {
  return {
    command: getNpxCommand(platform),
    args: [
      'vitest',
      'run',
      '--project',
      run.project,
      '--reporter=dot',
      '--reporter=junit',
      `--outputFile.junit=${run.reportPath}`,
    ],
  };
}

function buildBudgetCommand(run, options) {
  return {
    command: process.execPath,
    args: [
      path.join(ROOT, 'scripts', 'report-test-timings.js'),
      run.reportPath,
      `--max-suite-seconds=${options.maxSuiteSeconds}`,
      `--max-test-seconds=${options.maxTestSeconds}`,
    ],
  };
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function printUsage(stdout) {
  stdout.write(`Usage: node scripts/run-vitest-project-timings.js [options]

Options:
  --projects=a,b            Comma-separated Vitest projects. Default: ${DEFAULT_PROJECTS.join(',')}
  --repeat=N                Run each project N times. Default: 1
  --report-dir=PATH         Directory for per-run JUnit reports. Default: test-results
  --max-suite-seconds=N     Fail when any suite is slower than N seconds. Default: ${DEFAULT_MAX_SUITE_SECONDS}
  --max-test-seconds=N      Fail when any test is slower than N seconds. Default: ${DEFAULT_MAX_TEST_SECONDS}
  --dry-run                 Print commands without running them.
`);
}

function runCommand(command, args, spawnSyncImpl) {
  return spawnSyncImpl(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
}

function writeLaunchError(stderr, label, error) {
  const message = error instanceof Error ? error.message : String(error);
  stderr.write(`Failed to launch ${label}: ${message}\n`);
}

function run(argv = process.argv.slice(2), streams = process, spawnSyncImpl = spawnSync) {
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

  if (!options.dryRun) {
    fs.mkdirSync(options.reportDir, { recursive: true });
  }

  const results = new Map();

  for (const projectRun of buildProjectRuns(options)) {
    const vitestCommand = buildVitestCommand(projectRun);
    const budgetCommand = buildBudgetCommand(projectRun, options);

    streams.stdout.write(
      `\n[${projectRun.project}] run ${projectRun.iteration}/${options.repeat} -> ${path.relative(
        ROOT,
        projectRun.reportPath,
      )}\n`,
    );

    if (options.dryRun) {
      streams.stdout.write(`  ${vitestCommand.command} ${vitestCommand.args.join(' ')}\n`);
      streams.stdout.write(`  ${budgetCommand.command} ${budgetCommand.args.join(' ')}\n`);
      continue;
    }

    const startedAt = Date.now();
    const testResult = runCommand(vitestCommand.command, vitestCommand.args, spawnSyncImpl);
    const durationMs = Date.now() - startedAt;

    if (testResult.error) {
      writeLaunchError(streams.stderr, 'vitest', testResult.error);
      return 1;
    }

    if (testResult.status !== 0) {
      return testResult.status || 1;
    }

    const budgetResult = runCommand(budgetCommand.command, budgetCommand.args, spawnSyncImpl);

    if (budgetResult.error) {
      writeLaunchError(streams.stderr, 'budget check', budgetResult.error);
      return 1;
    }

    if (budgetResult.status !== 0) {
      return budgetResult.status || 1;
    }

    const projectResults = results.get(projectRun.project) || [];
    projectResults.push(durationMs);
    results.set(projectRun.project, projectResults);
  }

  if (options.dryRun) {
    return 0;
  }

  streams.stdout.write('\nVitest project timing summary\n');

  for (const project of options.projects) {
    const projectResults = results.get(project) || [];
    const worst = projectResults.length > 0 ? Math.max(...projectResults) : 0;
    streams.stdout.write(
      `  ${project}: runs=${projectResults.length} median=${formatSeconds(
        median(projectResults),
      )} worst=${formatSeconds(worst)}\n`,
    );
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
  buildBudgetCommand,
  buildProjectRuns,
  buildVitestCommand,
  getNpxCommand,
  getReportPath,
  median,
  parseArgs,
  run,
};
