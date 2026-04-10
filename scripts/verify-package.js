#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

function log(message) {
  process.stdout.write(`${message}\n`);
}

function mktemp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function createNpmEnv() {
  const cacheDir = mktemp('ttdash-npm-cache-');

  return {
    ...process.env,
    npm_config_cache: cacheDir,
    NPM_CONFIG_CACHE: cacheDir,
  };
}

function parsePackJson(output) {
  const trimmed = output.trim();
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(output.slice(start, end + 1));
  }

  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];

    if (!line.startsWith('[')) continue;

    try {
      return JSON.parse(line);
    } catch {}
  }

  throw new Error(`npm pack did not produce JSON output.\n${output}`);
}

function cliBinName() {
  return process.platform === 'win32' ? 'ttdash.cmd' : 'ttdash';
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not resolve a free port.')));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function waitForServer(url, child) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) {
      throw new Error(`Packaged TTDash exited before startup completed (exit ${child.exitCode}).`);
    }

    try {
      const response = await fetch(`${url}/api/usage`);
      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Timed out waiting for packaged TTDash to start.');
}

function verifyInstalledCli(command, tarballPath, npmEnv) {
  const installDir = mktemp('ttdash-install-');
  const installPackageJson = path.join(installDir, 'package.json');
  fs.writeFileSync(installPackageJson, JSON.stringify({ name: 'ttdash-package-smoke', private: true }, null, 2) + '\n');

  run(command, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], {
    cwd: installDir,
    env: npmEnv,
  });

  const installedCliPath = path.join(installDir, 'node_modules', '.bin', cliBinName());
  if (!fs.existsSync(installedCliPath)) {
    throw new Error(`Installed CLI binary missing: ${installedCliPath}`);
  }

  const helpOutput = run(installedCliPath, ['--help'], {
    cwd: installDir,
    env: npmEnv,
  });

  if (!helpOutput.includes(`TTDash v${packageJson.version}`)) {
    throw new Error('Installed tarball CLI help output did not contain the expected version banner.');
  }

  log('Verified installed tarball CLI help output.');
}

async function main() {
  const command = npmCommand();
  const packDir = mktemp('ttdash-pack-');
  const appDataRoot = mktemp('ttdash-pack-app-');
  const npmEnv = createNpmEnv();

  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    log('Production bundle missing, running build first.');
    run(command, ['run', 'build'], { env: npmEnv });
  }

  const packJson = run(command, ['pack', '--json', '--ignore-scripts', '--pack-destination', packDir], {
    env: npmEnv,
  });
  const [packInfo] = parsePackJson(packJson);

  if (!packInfo || !packInfo.filename) {
    throw new Error('npm pack did not return a tarball filename.');
  }

  const tarballPath = path.join(packDir, packInfo.filename);
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Packed tarball missing: ${tarballPath}`);
  }

  log(`Packed artifact: ${tarballPath}`);
  log(`Tarball size: ${packInfo.size} bytes`);

  verifyInstalledCli(command, tarballPath, npmEnv);

  const helpOutput = run(command, ['exec', '--yes', '--package', tarballPath, '--', 'ttdash', '--help'], {
    env: npmEnv,
  });

  if (!helpOutput.includes(`TTDash v${packageJson.version}`)) {
    throw new Error('Packaged CLI help output did not contain the expected version banner.');
  }

  log('Verified packaged CLI help output.');

  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(command, ['exec', '--yes', '--package', tarballPath, '--', 'ttdash', '--no-open', '--port', String(port)], {
    cwd: ROOT,
    env: {
      ...npmEnv,
      HOME: appDataRoot,
      NO_OPEN_BROWSER: '1',
      HOST: '127.0.0.1',
      PORT: String(port),
      XDG_CACHE_HOME: path.join(appDataRoot, 'cache'),
      XDG_CONFIG_HOME: path.join(appDataRoot, 'config'),
      XDG_DATA_HOME: path.join(appDataRoot, 'data'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServer(url, child);
    const usageResponse = await fetch(`${url}/api/usage`);
    if (!usageResponse.ok) {
      throw new Error(`Packaged server returned ${usageResponse.status} from /api/usage.`);
    }
    log(`Verified packaged startup on ${url}.`);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
  }

  if (!output.includes('TTDash v')) {
    throw new Error('Packaged server startup output was missing the expected banner.');
  }

  log('Package verification completed successfully.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
