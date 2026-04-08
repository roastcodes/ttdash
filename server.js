#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { parseArgs } = require('util');
const { normalizeIncomingData } = require('./usage-normalizer');
const { generatePdfReport } = require('./server/report');
const { version: APP_VERSION } = require('./package.json');

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, 'dist');
const APP_DIR_NAME = 'TTDash';
const APP_DIR_NAME_LINUX = 'ttdash';
const LEGACY_DATA_FILE = path.join(ROOT, 'data.json');
const CLI_OPTIONS = parseCliArgs(process.argv.slice(2));
const ENV_START_PORT = parseInt(process.env.PORT, 10);
const START_PORT = CLI_OPTIONS.port ?? (Number.isFinite(ENV_START_PORT) ? ENV_START_PORT : 3000);
const MAX_PORT = START_PORT + 100;
const API_PREFIX = '/port/5000/api';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
const IS_WINDOWS = process.platform === 'win32';
const TOKTRACK_LOCAL_BIN = path.join(ROOT, 'node_modules', '.bin', IS_WINDOWS ? 'toktrack.cmd' : 'toktrack');
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
const APP_LABEL = 'TTDash';
const DEFAULT_SETTINGS = {
  language: 'de',
  theme: 'dark',
  providerLimits: {},
  lastLoadedAt: null,
  lastLoadSource: null,
};
let startupAutoLoadCompleted = false;

function normalizeCliArgs(args) {
  return args.map((arg) => {
    if (arg === '-no') {
      return '--no-open';
    }
    if (arg === '-al') {
      return '--auto-load';
    }
    return arg;
  });
}

function printHelp() {
  console.log(`TTDash v${APP_VERSION}`);
  console.log('');
  console.log('Verwendung:');
  console.log('  ttdash [optionen]');
  console.log('');
  console.log('Optionen:');
  console.log('  -p, --port <port>   Startport festlegen');
  console.log('  -h, --help          Diese Hilfe anzeigen');
  console.log('  -no, --no-open      Browser-Autostart deaktivieren');
  console.log('  -al, --auto-load    Führt direkt beim Start einen Auto-Import aus');
  console.log('');
  console.log('Beispiele:');
  console.log('  ttdash --port 3010');
  console.log('  ttdash -p 3010 -no');
  console.log('  ttdash --auto-load');
  console.log('');
  console.log('Umgebungsvariablen:');
  console.log('  PORT=3010 ttdash');
  console.log('  NO_OPEN_BROWSER=1 ttdash');
}

function parseCliArgs(rawArgs) {
  const args = normalizeCliArgs(rawArgs);

  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: {
        port: {
          type: 'string',
          short: 'p',
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
        'no-open': {
          type: 'boolean',
        },
        'auto-load': {
          type: 'boolean',
        },
      },
    });
  } catch (error) {
    console.error(error.message);
    console.log('');
    printHelp();
    process.exit(1);
  }

  if (parsed.values.help) {
    printHelp();
    process.exit(0);
  }

  let port;
  if (parsed.values.port !== undefined) {
    const parsedPort = Number.parseInt(parsed.values.port, 10);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      console.error(`Ungültiger Port: ${parsed.values.port}`);
      console.log('');
      printHelp();
      process.exit(1);
    }
    port = parsedPort;
  }

  return {
    port,
    noOpen: Boolean(parsed.values['no-open']),
    autoLoad: Boolean(parsed.values['auto-load']),
  };
}

function resolveAppPaths() {
  const homeDir = os.homedir();

  if (process.platform === 'darwin') {
    const appSupportDir = path.join(homeDir, 'Library', 'Application Support', APP_DIR_NAME);
    return {
      dataDir: appSupportDir,
      configDir: appSupportDir,
      cacheDir: path.join(homeDir, 'Library', 'Caches', APP_DIR_NAME),
    };
  }

  if (IS_WINDOWS) {
    return {
      dataDir: path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), APP_DIR_NAME),
      configDir: path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), APP_DIR_NAME),
      cacheDir: path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), APP_DIR_NAME, 'Cache'),
    };
  }

  const appName = APP_DIR_NAME_LINUX;
  return {
    dataDir: path.join(process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'), appName),
    configDir: path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appName),
    cacheDir: path.join(process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache'), appName),
  };
}

const APP_PATHS = resolveAppPaths();
const DATA_FILE = path.join(APP_PATHS.dataDir, 'data.json');
const SETTINGS_FILE = path.join(APP_PATHS.configDir, 'settings.json');
const NPX_CACHE_DIR = path.join(APP_PATHS.cacheDir, 'npx-cache');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureAppDirs() {
  ensureDir(APP_PATHS.dataDir);
  ensureDir(APP_PATHS.configDir);
  ensureDir(APP_PATHS.cacheDir);
  ensureDir(NPX_CACHE_DIR);
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filePath);
}

function migrateLegacyDataFile() {
  if (!fs.existsSync(LEGACY_DATA_FILE) || fs.existsSync(DATA_FILE)) {
    return;
  }

  ensureDir(path.dirname(DATA_FILE));

  try {
    fs.renameSync(LEGACY_DATA_FILE, DATA_FILE);
    console.log(`Migriere bestehende Daten nach ${DATA_FILE}`);
  } catch {
    fs.copyFileSync(LEGACY_DATA_FILE, DATA_FILE);
    try {
      fs.unlinkSync(LEGACY_DATA_FILE);
    } catch {}
    console.log(`Kopiere bestehende Daten nach ${DATA_FILE}`);
  }
}

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'de';
}

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function normalizeLastLoadSource(value) {
  return value === 'file' || value === 'auto-import' || value === 'cli-auto-load'
    ? value
    : null;
}

function normalizeIsoTimestamp(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function sanitizeCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

function normalizeProviderLimitConfig(value) {
  if (!value || typeof value !== 'object') {
    return {
      hasSubscription: false,
      subscriptionPrice: 0,
      monthlyLimit: 0,
    };
  }

  return {
    hasSubscription: Boolean(value.hasSubscription),
    subscriptionPrice: sanitizeCurrency(value.subscriptionPrice),
    monthlyLimit: sanitizeCurrency(value.monthlyLimit),
  };
}

function normalizeProviderLimits(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const next = {};
  for (const [provider, config] of Object.entries(value)) {
    next[provider] = normalizeProviderLimitConfig(config);
  }
  return next;
}

function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    language: normalizeLanguage(source.language),
    theme: normalizeTheme(source.theme),
    providerLimits: normalizeProviderLimits(source.providerLimits),
    lastLoadedAt: normalizeIsoTimestamp(source.lastLoadedAt),
    lastLoadSource: normalizeLastLoadSource(source.lastLoadSource),
  };
}

function toSettingsResponse(settings) {
  return {
    ...normalizeSettings(settings),
    cliAutoLoadActive: startupAutoLoadCompleted,
  };
}

function openBrowser(url) {
  if (!shouldOpenBrowser()) {
    return;
  }

  const platform = process.platform;
  const command = platform === 'darwin'
    ? 'open'
    : platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();
}

function shouldOpenBrowser() {
  return !(CLI_OPTIONS.noOpen || process.env.NO_OPEN_BROWSER === '1' || process.env.CI === '1' || !process.stdout.isTTY);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value || 0);
}

function formatInteger(value) {
  return new Intl.NumberFormat('de-CH').format(value || 0);
}

function describeDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    return 'keine lokale Datei gefunden';
  }

  try {
    const normalized = readData();
    if (!normalized) {
      return 'vorhanden, aber nicht lesbar';
    }

    const totalCost = formatCurrency(normalized.totals?.totalCost || 0);
    const totalTokens = formatInteger(normalized.totals?.totalTokens || 0);
    const dailyCount = formatInteger(normalized.daily?.length || 0);
    return `${dailyCount} Tage, ${totalCost}, ${totalTokens} Tokens`;
  } catch {
    return 'vorhanden, aber nicht lesbar';
  }
}

function printStartupSummary(url, port) {
  const browserMode = shouldOpenBrowser()
    ? 'aktiviert'
    : 'deaktiviert';
  const autoLoadMode = CLI_OPTIONS.autoLoad
    ? 'aktiviert'
    : 'deaktiviert';

  console.log('');
  console.log(`${APP_LABEL} v${APP_VERSION} ist bereit`);
  console.log(`  URL:            ${url}`);
  console.log(`  API:            ${url}/api/usage`);
  console.log(`  Port:           ${port}`);
  console.log(`  Static Root:    ${STATIC_ROOT}`);
  console.log(`  Daten-Datei:    ${DATA_FILE}`);
  console.log(`  Settings-Datei: ${SETTINGS_FILE}`);
  console.log(`  Datenstatus:    ${describeDataFile()}`);
  console.log(`  Browser-Start:  ${browserMode}`);
  console.log(`  Auto-Load:      ${autoLoadMode}`);
  console.log('');
  console.log('Verfügbare Wege für Daten:');
  console.log('  1. Auto-Import aus der App starten');
  console.log('  2. toktrack JSON per Upload importieren');
  console.log('');
  console.log('Nützliche Kommandos:');
  console.log(`  ttdash --port ${port}`);
  console.log(`  ttdash --port ${port} --no-open`);
  console.log(`  NO_OPEN_BROWSER=1 PORT=${port} node server.js`);
  console.log(`  curl ${url}/api/usage`);
  console.log('');
}

function getCacheControl(filePath) {
  if (filePath.includes(path.sep + 'assets' + path.sep)) {
    return 'public, max-age=31536000, immutable';
  }
  if (filePath.endsWith('.html')) {
    return 'no-cache';
  }
  return 'public, max-age=86400';
}

function serveFile(res, reqPath) {
  const ext = path.extname(reqPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(reqPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(STATIC_ROOT, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            ...SECURITY_HEADERS,
          });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(reqPath),
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

// --- API helpers ---

function readData() {
  try {
    return normalizeIncomingData(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
  } catch {
    return null;
  }
}

function writeData(data) {
  writeJsonAtomic(DATA_FILE, data);
}

function readSettings() {
  try {
    return toSettingsResponse(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')));
  } catch {
    return toSettingsResponse({
      ...DEFAULT_SETTINGS,
      providerLimits: {},
    });
  }
}

function writeSettings(settings) {
  writeJsonAtomic(SETTINGS_FILE, normalizeSettings(settings));
}

function updateSettings(patch) {
  const current = readSettings();
  const next = {
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {}),
  };

  if (patch && Object.prototype.hasOwnProperty.call(patch, 'providerLimits')) {
    next.providerLimits = normalizeProviderLimits(patch.providerLimits);
  } else {
    next.providerLimits = current.providerLimits;
  }

  next.language = normalizeLanguage(next.language);
  next.theme = normalizeTheme(next.theme);

  writeSettings(next);
  return toSettingsResponse(next);
}

function recordDataLoad(source) {
  const current = readSettings();
  const next = {
    ...current,
    lastLoadedAt: new Date().toISOString(),
    lastLoadSource: source,
  };

  writeSettings(next);
  return toSettingsResponse(next);
}

function clearDataLoadState() {
  const current = readSettings();
  const next = {
    ...current,
    lastLoadedAt: null,
    lastLoadSource: null,
  };

  writeSettings(next);
  return toSettingsResponse(next);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    req.on('data', (c) => {
      totalSize += c.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...SECURITY_HEADERS,
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, status, headers, filePath) {
  const stream = fs.createReadStream(filePath);
  res.writeHead(status, {
    ...headers,
    ...SECURITY_HEADERS,
  });
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, SECURITY_HEADERS);
      res.end('Internal Server Error');
      return;
    }
    res.destroy();
  });
  stream.pipe(res);
}

function resolveApiPath(pathname) {
  if (pathname.startsWith(API_PREFIX + '/')) {
    return pathname.slice(API_PREFIX.length);
  }
  if (pathname === API_PREFIX) {
    return '/';
  }
  if (pathname.startsWith('/api/')) {
    return pathname.slice(4);
  }
  if (pathname === '/api') {
    return '/';
  }
  return null;
}

// --- SSE helpers ---

function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

let autoImportRunning = false;

function shouldUseShell(command) {
  return IS_WINDOWS && /\.(cmd|bat)$/i.test(command);
}

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    ...options,
    shell: options.shell ?? shouldUseShell(command),
    windowsHide: options.windowsHide ?? true,
  });
}

function commandExists(command, args = ['--version']) {
  return new Promise((resolve) => {
    const child = spawnCommand(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function resolveToktrackRunner() {
  if (fs.existsSync(TOKTRACK_LOCAL_BIN)) {
    return {
      command: TOKTRACK_LOCAL_BIN,
      prefixArgs: [],
      env: process.env,
      method: 'lokal',
      label: 'lokales toktrack',
      displayCommand: 'node_modules/.bin/toktrack daily --json',
    };
  }

  if (await commandExists(IS_WINDOWS ? 'bun.exe' : 'bun')) {
    return {
      command: IS_WINDOWS ? 'bun.exe' : 'bunx',
      prefixArgs: IS_WINDOWS ? ['x', 'toktrack'] : ['toktrack'],
      env: process.env,
      method: 'bunx',
      label: 'bunx',
      displayCommand: 'bunx toktrack daily --json',
    };
  }

  if (await commandExists(IS_WINDOWS ? 'npx.cmd' : 'npx')) {
    return {
      command: IS_WINDOWS ? 'npx.cmd' : 'npx',
      prefixArgs: ['--yes', 'toktrack'],
      env: {
        ...process.env,
        npm_config_cache: NPX_CACHE_DIR,
      },
      method: 'npm',
      label: 'npm exec',
      displayCommand: 'npx --yes toktrack daily --json',
    };
  }

  return null;
}

function runToktrack(runner, args, { streamStderr = false, onStderr, signalOnClose } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(runner.command, [...runner.prefixArgs, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: runner.env,
    });

    let stdout = '';
    let stderr = '';

    if (signalOnClose) {
      signalOnClose(() => child.kill('SIGTERM'));
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      const line = chunk.toString();
      stderr += line;
      if (streamStderr && onStderr && line.trim()) {
        onStderr(line.trimEnd());
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trimEnd());
        return;
      }
      reject(new Error(stderr.trim() || `${runner.label} konnte nicht gestartet werden.`));
    });
  });
}

async function performAutoImport({
  source = 'auto-import',
  onCheck = () => {},
  onProgress = () => {},
  onOutput = () => {},
  signalOnClose,
} = {}) {
  if (autoImportRunning) {
    throw new Error('Ein Auto-Import läuft bereits. Bitte warten.');
  }

  autoImportRunning = true;
  let progressSeconds = 0;
  const progressInterval = setInterval(() => {
    progressSeconds += 5;
    onOutput(`Verarbeite Nutzungsdaten... (${progressSeconds}s)`);
  }, 5000);

  try {
    onCheck({ tool: 'toktrack', status: 'checking' });
    onProgress({ message: 'Starte lokalen toktrack-Import...' });

    const runner = await resolveToktrackRunner();
    if (!runner) {
      onCheck({ tool: 'toktrack', status: 'not_found' });
      throw new Error('Kein lokales toktrack, Bun oder npm exec gefunden.');
    }

    const versionResult = await runToktrack(runner, ['--version']);
    onCheck({
      tool: 'toktrack',
      status: 'found',
      method: runner.label,
      version: String(versionResult).replace(/^toktrack\s+/, ''),
    });
    onProgress({ message: `Lade Nutzungsdaten via ${runner.displayCommand}...` });

    const rawJson = await runToktrack(runner, ['daily', '--json'], {
      streamStderr: true,
      onStderr: (line) => {
        onOutput(line);
      },
      signalOnClose,
    });

    const normalized = normalizeIncomingData(JSON.parse(rawJson));
    writeData(normalized);
    recordDataLoad(source);

    return {
      days: normalized.daily.length,
      totalCost: normalized.totals.totalCost,
    };
  } finally {
    clearInterval(progressInterval);
    autoImportRunning = false;
  }
}

async function runStartupAutoLoad({ source = 'cli-auto-load' } = {}) {
  console.log('Auto-Load aktiviert, starte Import...');

  try {
    const result = await performAutoImport({
      source,
      onCheck: (event) => {
        if (event.status === 'found') {
          console.log(`toktrack gefunden (${event.method}, v${event.version})`);
        }
      },
      onProgress: (event) => {
        console.log(event.message);
      },
      onOutput: (line) => {
        console.log(line);
      },
    });

    startupAutoLoadCompleted = true;
    console.log(`Auto-Load abgeschlossen: ${result.days} Tage importiert, ${formatCurrency(result.totalCost)}.`);
  } catch (error) {
    console.error(`Auto-Load fehlgeschlagen: ${error.message}`);
    console.error('Dashboard startet ohne neu importierte Daten.');
  }
}

// --- Server ---

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // API routing
  const apiPath = resolveApiPath(pathname);

  if (apiPath === '/usage') {
    if (req.method === 'GET') {
      const data = readData();
      return json(res, 200, data || {
        daily: [],
        totals: {
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          totalCost: 0,
          totalTokens: 0,
          requestCount: 0,
        },
      });
    }
    if (req.method === 'DELETE') {
      try { fs.unlinkSync(DATA_FILE); } catch {}
      clearDataLoadState();
      return json(res, 200, { success: true });
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/settings') {
    if (req.method === 'GET') {
      return json(res, 200, readSettings());
    }

    if (req.method === 'PATCH') {
      try {
        const body = await readBody(req);
        return json(res, 200, updateSettings(body));
      } catch (e) {
        return json(res, 400, { message: e.message || 'Ungültige Settings-Anfrage' });
      }
    }

    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/upload') {
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        const normalized = normalizeIncomingData(body);
        writeData(normalized);
        recordDataLoad('file');
        const days = normalized.daily.length;
        const totalCost = normalized.totals.totalCost;
        return json(res, 200, { days, totalCost });
      } catch (e) {
        const status = e.message === 'Payload too large' ? 413 : 400;
        const message = e.message === 'Payload too large'
          ? 'Datei zu gross (max. 10 MB)'
          : e.message || 'Ungültiges JSON';
        return json(res, status, { message });
      }
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/auto-import/stream') {
    if (req.method !== 'GET') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...SECURITY_HEADERS,
    });

    let aborted = false;
    req.on('close', () => { aborted = true; });

    try {
      const result = await performAutoImport({
        source: 'auto-import',
        onCheck: (event) => {
          if (!aborted) {
            sendSSE(res, 'check', event);
          }
        },
        onProgress: (event) => {
          if (!aborted) {
            sendSSE(res, 'progress', event);
          }
        },
        onOutput: (line) => {
          if (!aborted) {
            sendSSE(res, 'stderr', { line });
          }
        },
        signalOnClose: (close) => {
          req.on('close', close);
        },
      });

      if (aborted) { return; }

      sendSSE(res, 'success', result);
      sendSSE(res, 'done', {});
      res.end();
    } catch (err) {
      if (aborted) { return; }
      sendSSE(res, 'error', { message: `Fehler: ${err.message}` });
      sendSSE(res, 'done', {});
      res.end();
    }
    return;
  }

  if (apiPath === '/report/pdf') {
    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const data = readData();
    if (!data || !Array.isArray(data.daily) || data.daily.length === 0) {
      return json(res, 400, { message: 'Keine Daten für den Report vorhanden.' });
    }

    let body = {};
    try {
      body = await readBody(req);
    } catch (e) {
      const status = e.message === 'Payload too large' ? 413 : 400;
      return json(res, status, { message: e.message === 'Payload too large' ? 'Report-Anfrage zu gross' : 'Ungültige Report-Anfrage' });
    }

    try {
      const result = await generatePdfReport(data.daily, body || {});
      const cleanup = () => {
        try {
          fs.rmSync(result.tempDir, { recursive: true, force: true });
        } catch {}
      };

      res.on('close', cleanup);
      res.on('finish', cleanup);

      return sendFile(res, 200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      }, result.pdfPath);
    } catch (error) {
      const message = error && error.message ? error.message : 'PDF-Generierung fehlgeschlagen';
      const status = error && error.code === 'TYPST_MISSING' ? 503 : 500;
      return json(res, status, { message });
    }
  }

  if (apiPath !== null) {
    return json(res, 404, { message: 'API-Endpunkt nicht gefunden' });
  }

  // Static file serving
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(STATIC_ROOT, `.${safePath}`);

  if (!filePath.startsWith(path.resolve(STATIC_ROOT) + path.sep) && filePath !== path.resolve(STATIC_ROOT, 'index.html')) {
    return json(res, 403, { message: 'Zugriff verweigert' });
  }

  serveFile(res, filePath);
});

function tryListen(port) {
  return new Promise((resolve, reject) => {
    if (port > MAX_PORT) {
      reject(new Error(`Kein freier Port gefunden (${START_PORT}-${MAX_PORT})`));
      return;
    }

    const onError = (err) => {
      server.off('listening', onListening);
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} belegt, versuche ${port + 1}...`);
        resolve(tryListen(port + 1));
      } else {
        reject(err);
      }
    };

    const onListening = () => {
      server.off('error', onError);
      resolve(port);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

async function start() {
  ensureAppDirs();
  migrateLegacyDataFile();

  const port = await tryListen(START_PORT);
  const url = `http://localhost:${port}`;

  if (CLI_OPTIONS.autoLoad) {
    await runStartupAutoLoad({
      source: 'cli-auto-load',
    });
  }

  printStartupSummary(url, port);
  openBrowser(url);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Graceful shutdown on Ctrl+C / kill
function shutdown(signal) {
  console.log(`\n${signal} empfangen, fahre Server herunter...`);
  server.close(() => {
    console.log('Server gestoppt.');
    process.exit(0);
  });
  // Force exit after 3s if connections don't close
  setTimeout(() => {
    console.log('Erzwinge Beendigung.');
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
