const http = require('http');
const { spawnSync } = require('child_process');

const imageTag = `ttdash-docker-smoke:${process.pid}`;
const containerName = `ttdash-docker-smoke-${process.pid}`;
const remoteToken = 'ttdash-docker-smoke-token-1234567890';
const maxImageSizeBytes = 220 * 1024 * 1024;

function runDocker(args, { allowFailure = false } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 5 * 60 * 1000 });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      [`docker ${args.join(' ')} failed`, result.error?.message, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result;
}

function request({ port, path = '/', method = 'GET', headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    req.setTimeout(5000, () => req.destroy(new Error(`Request to ${path} timed out`)));
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(port, headers = {}) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request({ port, path: '/', headers });
      if (response.status === 200) return;
      lastError = new Error(`Dashboard returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error('Docker server did not become ready');
}

function expectStatus(response, status, context) {
  if (response.status !== status) {
    throw new Error(
      `${context}: expected ${status}, received ${response.status}: ${response.body}`,
    );
  }
}

async function main() {
  runDocker(['build', '--tag', imageTag, '.']);

  const size = Number(
    runDocker(['image', 'inspect', imageTag, '--format', '{{.Size}}']).stdout.trim(),
  );
  if (!Number.isFinite(size) || size > maxImageSizeBytes) {
    throw new Error(
      `Docker image is too large: ${Math.round(size / 1024 / 1024)} MiB (limit 220 MiB)`,
    );
  }

  const missingToken = runDocker(['run', '--rm', imageTag], { allowFailure: true });
  if (
    missingToken.status === 0 ||
    !`${missingToken.stdout}${missingToken.stderr}`.includes('TTDASH_REMOTE_TOKEN')
  ) {
    throw new Error('Docker image must fail closed when TTDASH_REMOTE_TOKEN is missing');
  }

  runDocker([
    'run',
    '--detach',
    '--name',
    containerName,
    '--publish',
    '127.0.0.1::3000',
    '--env',
    `TTDASH_REMOTE_TOKEN=${remoteToken}`,
    imageTag,
  ]);

  const portOutput = runDocker(['port', containerName, '3000/tcp']).stdout.trim();
  const port = Number(portOutput.slice(portOutput.lastIndexOf(':') + 1));
  if (!Number.isInteger(port)) throw new Error(`Could not resolve Docker port from ${portOutput}`);
  await waitForServer(port);

  const dashboard = await request({ port });
  expectStatus(dashboard, 200, 'localhost dashboard');

  const unauthorized = await request({ port, path: '/api/usage' });
  expectStatus(unauthorized, 401, 'unauthenticated localhost API');
  if (unauthorized.headers['x-ttdash-auth-mode'] !== 'remote') {
    throw new Error('Remote authentication mode header is missing');
  }

  const origin = `http://127.0.0.1:${port}`;
  const login = await request({
    port,
    path: '/api/auth/session',
    method: 'POST',
    headers: { Authorization: `Bearer ${remoteToken}`, Origin: origin },
  });
  expectStatus(login, 204, 'remote browser login');
  const sessionCookie = String(login.headers['set-cookie']?.[0] || '').split(';', 1)[0];
  if (!sessionCookie.startsWith('ttdash_auth=')) throw new Error('Session cookie is missing');

  expectStatus(
    await request({ port, path: '/api/usage', headers: { Cookie: sessionCookie } }),
    200,
    'session-authenticated API',
  );

  runDocker(['rm', '--force', containerName]);
  runDocker([
    'run',
    '--detach',
    '--name',
    containerName,
    '--publish',
    '127.0.0.1::3000',
    '--env',
    `TTDASH_REMOTE_TOKEN=${remoteToken}`,
    '--env',
    'TTDASH_TRUSTED_HOSTS=dashboard.example',
    imageTag,
  ]);
  const serverPortOutput = runDocker(['port', containerName, '3000/tcp']).stdout.trim();
  const serverPort = Number(serverPortOutput.slice(serverPortOutput.lastIndexOf(':') + 1));
  if (!Number.isInteger(serverPort)) {
    throw new Error(`Could not resolve Docker port from ${serverPortOutput}`);
  }
  await waitForServer(serverPort, { Host: 'dashboard.example' });

  expectStatus(
    await request({
      port: serverPort,
      path: '/api/usage',
      headers: { Host: 'dashboard.example', Authorization: `Bearer ${remoteToken}` },
    }),
    200,
    'explicit trusted server host',
  );
  expectStatus(
    await request({
      port: serverPort,
      path: '/api/usage',
      headers: { Host: 'evil.example', Authorization: `Bearer ${remoteToken}` },
    }),
    403,
    'untrusted server host',
  );
  expectStatus(
    await request({
      port: serverPort,
      path: '/api/usage',
      headers: { Host: 'localhost', Authorization: `Bearer ${remoteToken}` },
    }),
    403,
    'Docker loopback default replaced by explicit server host',
  );

  console.log(`Docker smoke passed (${Math.round(size / 1024 / 1024)} MiB image).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    runDocker(['rm', '--force', containerName], { allowFailure: true });
    runDocker(['image', 'rm', '--force', imageTag], { allowFailure: true });
  });
