const { parseArgs } = require('util');

function normalizeCliArgs(args) {
  return args.map((arg) => {
    if (arg === '-no') {
      return '--no-open';
    }
    if (arg === '-al') {
      return '--auto-load';
    }
    if (arg === '-bg') {
      return '--background';
    }
    return arg;
  });
}

function printHelp({ appVersion, log = console.log } = {}) {
  log(`TTDash v${appVersion}`);
  log('');
  log('Usage:');
  log('  ttdash [options]');
  log('  ttdash stop');
  log('');
  log('Options:');
  log('  -p, --port <port>   Set the start port');
  log('  -h, --help          Show this help');
  log('  -no, --no-open      Disable browser auto-open');
  log('  -al, --auto-load    Run auto-import immediately on startup');
  log('  --export [path]     Export local system data and exit');
  log('  -b, -bg, --background  Start TTDash as a background process');
  log('  --docker            Start with secure container defaults');
  log('');
  log('Examples:');
  log('  ttdash --port 3010');
  log('  ttdash -p 3010 -no');
  log('  ttdash --auto-load');
  log('  ttdash --export');
  log('  ttdash --auto-load --export ./backups');
  log('  ttdash --background');
  log('  ttdash --docker');
  log('  ttdash stop');
  log('');
  log('Environment variables:');
  log('  PORT=3010 ttdash');
  log('  NO_OPEN_BROWSER=1 ttdash');
  log('  HOST=127.0.0.1 ttdash');
  log('  TTDASH_DOCKER=1 TTDASH_REMOTE_TOKEN=<long-random-token> ttdash');
  log('  TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=0.0.0.0 ttdash');
}

function exitWithHelp({ code, message, appVersion, log, errorLog, exit }) {
  if (message) {
    errorLog(message);
    log('');
  }
  printHelp({ appVersion, log });
  exit(code);
}

function parseCliArgs(
  rawArgs,
  {
    appVersion,
    parseArgsImpl = parseArgs,
    log = console.log,
    errorLog = console.error,
    exit = process.exit,
  } = {},
) {
  const normalizedArgs = normalizeCliArgs(rawArgs);
  let exportRequested = false;
  let exportPath = null;
  const args = [];

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];
    if (arg.startsWith('--export=')) {
      exportRequested = true;
      exportPath = arg.slice('--export='.length) || null;
      continue;
    }
    if (arg === '--export') {
      exportRequested = true;
      const candidate = normalizedArgs[index + 1];
      if (candidate && !candidate.startsWith('-') && candidate !== 'stop') {
        exportPath = candidate;
        index += 1;
      }
      continue;
    }
    args.push(arg);
  }

  let parsed;
  try {
    parsed = parseArgsImpl({
      args,
      allowPositionals: true,
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
        background: {
          type: 'boolean',
          short: 'b',
        },
        docker: {
          type: 'boolean',
        },
      },
    });
  } catch (error) {
    exitWithHelp({
      code: 1,
      message: error.message,
      appVersion,
      log,
      errorLog,
      exit,
    });
    return null;
  }

  if (parsed.values.help) {
    printHelp({ appVersion, log });
    exit(0);
    return null;
  }

  let command = null;
  if (parsed.positionals.length > 1) {
    exitWithHelp({
      code: 1,
      message: `Unknown invocation: ${parsed.positionals.join(' ')}`,
      appVersion,
      log,
      errorLog,
      exit,
    });
    return null;
  }

  if (parsed.positionals.length === 1) {
    if (parsed.positionals[0] !== 'stop') {
      exitWithHelp({
        code: 1,
        message: `Unknown command: ${parsed.positionals[0]}`,
        appVersion,
        log,
        errorLog,
        exit,
      });
      return null;
    }

    command = 'stop';
  }

  if (exportRequested && (command === 'stop' || parsed.values.background)) {
    exitWithHelp({
      code: 1,
      message: '--export cannot be combined with stop or --background.',
      appVersion,
      log,
      errorLog,
      exit,
    });
    return null;
  }

  let port;
  if (parsed.values.port !== undefined) {
    const portValue = String(parsed.values.port);
    const parsedPort = /^\d+$/.test(portValue) ? Number(portValue) : NaN;
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      exitWithHelp({
        code: 1,
        message: `Invalid port: ${parsed.values.port}`,
        appVersion,
        log,
        errorLog,
        exit,
      });
      return null;
    }
    port = parsedPort;
  }

  return {
    command,
    port,
    noOpen: Boolean(parsed.values['no-open']),
    autoLoad: Boolean(parsed.values['auto-load']),
    background: Boolean(parsed.values.background),
    docker: Boolean(parsed.values.docker),
    export: exportRequested,
    exportPath,
  };
}

module.exports = {
  normalizeCliArgs,
  parseCliArgs,
  printHelp,
};
