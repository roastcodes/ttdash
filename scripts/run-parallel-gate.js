#!/usr/bin/env node

const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function createTask(name, script, outputPaths = []) {
  return {
    name,
    command: npmCommand,
    args: ['run', script],
    outputPaths,
  };
}

function createParallelGatePlan({ e2e = false } = {}) {
  const buildAndApiGroup = [
    createTask('static', 'test:static'),
    createTask('integration', 'test:vitest:integration', [
      'test-results/vitest-integration.junit.xml',
    ]),
    createTask('build', 'build:app'),
  ];
  const unitGroup = [
    createTask('unit', 'test:vitest:unit', ['test-results/vitest-unit.junit.xml']),
  ];
  const frontendGroup = [
    createTask('frontend', 'test:vitest:frontend', ['test-results/vitest-frontend.junit.xml']),
  ];
  const architectureGroup = [
    createTask('architecture', 'test:vitest:architecture', [
      'test-results/vitest-architecture.junit.xml',
    ]),
  ];
  const backgroundGroup = [
    createTask('integration-background', 'test:vitest:integration-background', [
      'test-results/vitest-integration-background.junit.xml',
    ]),
  ];
  const finalGroup = [createTask('package-smoke', 'verify:package')];

  if (e2e) {
    finalGroup.push(createTask('e2e', 'test:e2e:ci', ['playwright-report/', 'test-results/']));
  }

  return [
    buildAndApiGroup,
    unitGroup,
    frontendGroup,
    architectureGroup,
    backgroundGroup,
    finalGroup,
  ];
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    e2e: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--e2e') {
      options.e2e = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function findParallelOutputCollisions(plan) {
  const collisions = [];

  plan.forEach((group, groupIndex) => {
    const outputOwners = new Map();

    for (const task of group) {
      for (const outputPath of task.outputPaths || []) {
        const owners = outputOwners.get(outputPath) || [];
        owners.push(task.name);
        outputOwners.set(outputPath, owners);
      }
    }

    for (const [outputPath, tasks] of outputOwners.entries()) {
      if (tasks.length > 1) {
        collisions.push({
          group: groupIndex + 1,
          outputPath,
          tasks,
        });
      }
    }
  });

  return collisions;
}

function printUsage(stdout) {
  stdout.write(`Usage: node scripts/run-parallel-gate.js [options]

Options:
  --e2e      Run the Playwright CI smoke after the build group succeeds.
  --dry-run  Print the task graph without running commands.
`);
}

function prefixChunk(stream, taskName, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.length > 0) {
      stream.write(`[${taskName}] ${line}\n`);
    }
  }
}

function formatDuration(durationMs) {
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function runTask(task, spawnImpl = spawn, streams = process) {
  return new Promise((resolve) => {
    streams.stdout.write(`[${task.name}] starting ${task.command} ${task.args.join(' ')}\n`);
    const startedAt = Date.now();

    const child = spawnImpl(task.command, task.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => prefixChunk(streams.stdout, task.name, chunk));
    child.stderr.on('data', (chunk) => prefixChunk(streams.stderr, task.name, chunk));
    child.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      streams.stderr.write(`[${task.name}] failed to start: ${error.message}\n`);
      resolve({ durationMs, task, status: 1 });
    });
    child.on('close', (status) => {
      const durationMs = Date.now() - startedAt;
      streams.stdout.write(
        `[${task.name}] exited with ${status ?? 1} after ${formatDuration(durationMs)}\n`,
      );
      resolve({ durationMs, task, status: status ?? 1 });
    });
  });
}

async function runTaskGroup(tasks, spawnImpl, streams) {
  const results = await Promise.all(tasks.map((task) => runTask(task, spawnImpl, streams)));
  return {
    results,
    status: results.every((result) => result.status === 0) ? 0 : 1,
  };
}

function printTimingSummary(results, streams = process) {
  if (results.length === 0) {
    return;
  }

  streams.stdout.write('\nparallel gate timing summary\n');

  for (const result of results) {
    streams.stdout.write(
      `  ${result.task.name}: status=${result.status} duration=${formatDuration(
        result.durationMs,
      )}\n`,
    );
  }
}

async function run(argv = process.argv.slice(2), streams = process, spawnImpl = spawn) {
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

  const plan = createParallelGatePlan({ e2e: options.e2e });
  const outputCollisions = findParallelOutputCollisions(plan);

  if (outputCollisions.length > 0) {
    streams.stderr.write('Parallel gate output collision detected.\n');
    outputCollisions.forEach((collision) => {
      streams.stderr.write(
        `  group ${collision.group}: ${collision.outputPath} <- ${collision.tasks.join(', ')}\n`,
      );
    });
    return 1;
  }

  if (options.dryRun) {
    plan.forEach((group, index) => {
      streams.stdout.write(`group ${index + 1}\n`);
      group.forEach((task) => {
        streams.stdout.write(`  ${task.name}: ${task.command} ${task.args.join(' ')}\n`);
        if (task.outputPaths.length > 0) {
          streams.stdout.write(`    outputs: ${task.outputPaths.join(', ')}\n`);
        }
      });
    });
    return 0;
  }

  const allResults = [];

  for (const [index, group] of plan.entries()) {
    streams.stdout.write(`\nparallel gate group ${index + 1}/${plan.length}\n`);
    const groupResult = await runTaskGroup(group, spawnImpl, streams);
    allResults.push(...groupResult.results);

    if (groupResult.status !== 0) {
      printTimingSummary(allResults, streams);
      return groupResult.status;
    }
  }

  printTimingSummary(allResults, streams);
  return 0;
}

function main() {
  run().then((status) => {
    process.exitCode = status;
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  createParallelGatePlan,
  findParallelOutputCollisions,
  parseArgs,
  run,
};
