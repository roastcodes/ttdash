#!/usr/bin/env node

const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function createTask(name, script) {
  return {
    name,
    command: npmCommand,
    args: ['run', script],
  };
}

function createParallelGatePlan({ e2e = false } = {}) {
  const buildAndApiGroup = [
    createTask('static', 'test:static'),
    createTask('integration', 'test:vitest:integration'),
    createTask('build', 'build:app'),
  ];
  const unitGroup = [createTask('unit', 'test:vitest:unit')];
  const frontendGroup = [createTask('frontend', 'test:vitest:frontend')];
  const architectureGroup = [createTask('architecture', 'test:vitest:architecture')];
  const backgroundGroup = [
    createTask('integration-background', 'test:vitest:integration-background'),
  ];
  const finalGroup = [createTask('package-smoke', 'verify:package')];

  if (e2e) {
    finalGroup.push(createTask('e2e', 'test:e2e:ci'));
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

function runTask(task, spawnImpl = spawn, streams = process) {
  return new Promise((resolve) => {
    streams.stdout.write(`[${task.name}] starting ${task.command} ${task.args.join(' ')}\n`);

    const child = spawnImpl(task.command, task.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => prefixChunk(streams.stdout, task.name, chunk));
    child.stderr.on('data', (chunk) => prefixChunk(streams.stderr, task.name, chunk));
    child.on('error', (error) => {
      streams.stderr.write(`[${task.name}] failed to start: ${error.message}\n`);
      resolve({ task, status: 1 });
    });
    child.on('close', (status) => {
      streams.stdout.write(`[${task.name}] exited with ${status ?? 1}\n`);
      resolve({ task, status: status ?? 1 });
    });
  });
}

async function runTaskGroup(tasks, spawnImpl, streams) {
  const results = await Promise.all(tasks.map((task) => runTask(task, spawnImpl, streams)));
  return results.every((result) => result.status === 0) ? 0 : 1;
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

  if (options.dryRun) {
    plan.forEach((group, index) => {
      streams.stdout.write(`group ${index + 1}\n`);
      group.forEach((task) => {
        streams.stdout.write(`  ${task.name}: ${task.command} ${task.args.join(' ')}\n`);
      });
    });
    return 0;
  }

  for (const [index, group] of plan.entries()) {
    streams.stdout.write(`\nparallel gate group ${index + 1}/${plan.length}\n`);
    const status = await runTaskGroup(group, spawnImpl, streams);
    if (status !== 0) {
      return status;
    }
  }

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
  parseArgs,
  run,
};
