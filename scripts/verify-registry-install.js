#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function mktemp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function parseArgs(argv) {
  const options = {
    packageName: null,
    version: null,
    retries: 6,
    retryDelayMs: 10000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--package' && next) {
      options.packageName = next;
      index += 1;
      continue;
    }

    if (arg === '--version' && next) {
      options.version = next;
      index += 1;
      continue;
    }

    if (arg === '--retries' && next) {
      options.retries = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--retry-delay-ms' && next) {
      options.retryDelayMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
  }

  if (!options.packageName || !options.version) {
    fail(
      'Usage: node scripts/verify-registry-install.js --package <name> --version <version> [--retries N] [--retry-delay-ms MS]',
    );
  }

  if (!Number.isInteger(options.retries) || options.retries <= 0) {
    fail(`Invalid retries value: ${options.retries}`);
  }

  if (!Number.isInteger(options.retryDelayMs) || options.retryDelayMs < 0) {
    fail(`Invalid retry delay value: ${options.retryDelayMs}`);
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createIsolatedWorkingDir(prefix) {
  const cwd = mktemp(prefix);
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: 'ttdash-registry-verify',
        private: true,
      },
      null,
      2,
    ) + '\n',
  );
  return cwd;
}

function runCommand(command, args, { cwd, env }) {
  return execFileSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
    killSignal: 'SIGTERM',
  });
}

function formatCommandError(error) {
  if (!error) {
    return 'Unknown command error';
  }

  if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
    return 'Command timed out after 120000 ms.';
  }

  if (error.stderr) {
    return String(error.stderr).trim();
  }

  return String(error);
}

function buildEnv(extra = {}) {
  return {
    ...process.env,
    ...extra,
  };
}

function verifyExpectedVersion(output, expected) {
  if (!output.includes(expected)) {
    throw new Error(`Expected output to contain "${expected}" but got:\n${output}`);
  }
}

async function verifyNpmExec(packageName, version, retries, retryDelayMs) {
  const expected = `TTDash v${version}`;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const cwd = createIsolatedWorkingDir('ttdash-registry-npm-');
    const cacheDir = mktemp('ttdash-registry-npm-cache-');

    try {
      const output = runCommand(
        'npm',
        [
          'exec',
          '--yes',
          '--prefer-online',
          '--package',
          `${packageName}@${version}`,
          '--',
          'ttdash',
          '--help',
        ],
        {
          cwd,
          env: buildEnv({
            npm_config_cache: cacheDir,
            NPM_CONFIG_CACHE: cacheDir,
          }),
        },
      );

      verifyExpectedVersion(output, expected);
      log(`Verified npm exec install path on attempt ${attempt}.`);
      log(output.trim());
      return;
    } catch (error) {
      lastError = error;
      const output = formatCommandError(error);
      log(`npm exec attempt ${attempt}/${retries} failed.`);
      if (output) {
        log(output);
      }
      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error(
    `npm exec install path did not become ready in time.\n${formatCommandError(lastError)}`,
  );
}

async function verifyBunx(packageName, version, retries, retryDelayMs) {
  const expected = `TTDash v${version}`;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const cwd = createIsolatedWorkingDir('ttdash-registry-bun-');
    const bunInstallDir = mktemp('ttdash-registry-bun-install-');
    const bunCacheDir = mktemp('ttdash-registry-bun-cache-');

    try {
      const output = runCommand('bunx', [`${packageName}@${version}`, '--help'], {
        cwd,
        env: buildEnv({
          BUN_INSTALL: bunInstallDir,
          BUN_INSTALL_CACHE_DIR: bunCacheDir,
        }),
      });

      verifyExpectedVersion(output, expected);
      log(`Verified bunx install path on attempt ${attempt}.`);
      log(output.trim());
      return;
    } catch (error) {
      lastError = error;
      const output = formatCommandError(error);
      log(`bunx attempt ${attempt}/${retries} failed.`);
      if (output) {
        log(output);
      }
      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error(
    `bunx install path did not become ready in time.\n${formatCommandError(lastError)}`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await verifyNpmExec(options.packageName, options.version, options.retries, options.retryDelayMs);
  await verifyBunx(options.packageName, options.version, options.retries, options.retryDelayMs);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
