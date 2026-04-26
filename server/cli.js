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
  log('  -b, -bg, --background  Start TTDash as a background process');
  log('');
  log('Examples:');
  log('  ttdash --port 3010');
  log('  ttdash -p 3010 -no');
  log('  ttdash --auto-load');
  log('  ttdash --background');
  log('  ttdash stop');
  log('');
  log('Environment variables:');
  log('  PORT=3010 ttdash');
  log('  NO_OPEN_BROWSER=1 ttdash');
  log('  HOST=127.0.0.1 ttdash');
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
  const args = normalizeCliArgs(rawArgs);

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

  let port;
  if (parsed.values.port !== undefined) {
    const parsedPort = Number.parseInt(parsed.values.port, 10);
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
  };
}

module.exports = {
  normalizeCliArgs,
  parseCliArgs,
  printHelp,
};
