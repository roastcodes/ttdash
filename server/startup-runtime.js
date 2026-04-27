function formatCurrency(value, locale = 'de-CH') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value || 0);
}

function formatInteger(value, locale = 'de-CH') {
  return new Intl.NumberFormat(locale).format(value || 0);
}

function createStartupRuntime({
  fs,
  spawnImpl,
  processObject = process,
  appLabel,
  appVersion,
  staticRoot,
  dataRuntime,
  serverAuth,
  localAuthSessionFile,
  apiPrefix,
  bindHost,
  cliOptions,
  isBackgroundChild,
  forceOpenBrowser,
  isLoopbackHost,
  autoImportRuntime,
  markStartupAutoLoadCompleted,
  log = console.log,
  errorLog = console.error,
}) {
  function shouldOpenBrowser() {
    if (
      cliOptions.noOpen ||
      processObject.env.NO_OPEN_BROWSER === '1' ||
      Boolean(processObject.env.CI)
    ) {
      return false;
    }

    if (forceOpenBrowser) {
      return true;
    }

    return Boolean(processObject.stdout?.isTTY);
  }

  function openBrowser(url) {
    if (!shouldOpenBrowser()) {
      return;
    }

    const command =
      processObject.platform === 'darwin'
        ? 'open'
        : processObject.platform === 'win32'
          ? 'cmd'
          : 'xdg-open';
    const args = processObject.platform === 'win32' ? ['/c', 'start', '', url] : [url];

    const child = spawnImpl(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => {});
    child.unref();
  }

  function describeDataFile() {
    if (!fs.existsSync(dataRuntime.paths.dataFile)) {
      return 'no local file found';
    }

    try {
      const normalized = dataRuntime.readData();
      if (!normalized) {
        return 'present, but unreadable';
      }

      const totalCost = formatCurrency(normalized.totals?.totalCost || 0);
      const totalTokens = formatInteger(normalized.totals?.totalTokens || 0);
      const days = normalized.daily?.length || 0;
      const dailyCount = formatInteger(days);
      const dayLabel = days === 1 ? 'day' : 'days';
      return `${dailyCount} ${dayLabel}, ${totalCost}, ${totalTokens} tokens`;
    } catch {
      return 'present, but unreadable';
    }
  }

  function printStartupSummary(url, port) {
    const browserMode = shouldOpenBrowser() ? 'enabled' : 'disabled';
    const autoLoadMode = cliOptions.autoLoad ? 'enabled' : 'disabled';
    const runtimeMode = isBackgroundChild ? 'background' : 'foreground';
    const remoteBind = !isLoopbackHost(bindHost);
    const localAuthRequired = serverAuth.isLocalRequired();
    const remoteAuthRequired =
      typeof serverAuth.isRemoteRequired === 'function'
        ? serverAuth.isRemoteRequired()
        : remoteBind;
    const bootstrapUrl = serverAuth.createBootstrapUrl(url);
    const usageApiUrl = `${url}${apiPrefix}/usage`;

    log('');
    log(`${appLabel} v${appVersion} is ready`);
    log(`  URL:            ${url}`);
    log(`  API:            ${usageApiUrl}`);
    log(`  Port:           ${port}`);
    log(`  Host:           ${bindHost}`);
    if (remoteBind) {
      log(`  Exposure:       network-accessible via ${bindHost}`);
      log(`  Remote Auth:    ${remoteAuthRequired ? 'required' : 'disabled'}`);
    } else {
      log(`  Local Auth:     ${localAuthRequired ? 'required' : 'disabled'}`);
    }
    log(`  Mode:           ${runtimeMode}`);
    log(`  Static Root:    ${staticRoot}`);
    log(`  Data File:      ${dataRuntime.paths.dataFile}`);
    log(`  Settings File:  ${dataRuntime.paths.settingsFile}`);
    if (isBackgroundChild && processObject.env.TTDASH_BACKGROUND_LOG_FILE) {
      log(`  Log File:       ${processObject.env.TTDASH_BACKGROUND_LOG_FILE}`);
    }
    log(`  Data Status:    ${describeDataFile()}`);
    log(`  Browser Open:   ${browserMode}`);
    log(`  Auto-Load:      ${autoLoadMode}`);
    if (localAuthRequired && !shouldOpenBrowser()) {
      log(`  Local Auth URL: ${bootstrapUrl}`);
    }
    if (remoteBind) {
      log('');
      log('Security warning: this bind host exposes the dashboard to the network.');
      log('Use non-loopback hosts only on trusted networks and keep TTDASH_REMOTE_TOKEN secret.');
      log('Use the bearer-token curl example below for remote API access.');
    }
    log('');
    log('Available ways to load data:');
    log('  1. Start auto-import from the app');
    log('  2. Import toktrack JSON via upload');
    log('');
    log('Useful commands:');
    log(`  ttdash --port ${port}`);
    log(`  ttdash --port ${port} --no-open`);
    log('  ttdash --background');
    log('  ttdash stop');
    log(`  NO_OPEN_BROWSER=1 PORT=${port} node server.js`);
    log(
      `  TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=${bindHost} PORT=${port} node server.js`,
    );
    if (remoteAuthRequired) {
      log(`  curl -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" ${usageApiUrl}`);
    } else if (localAuthRequired) {
      log(`  curl -H "Authorization: Bearer <session-token-from-local-auth-url>" ${usageApiUrl}`);
    } else {
      log(`  curl ${usageApiUrl}`);
    }
    log('');
  }

  function writeLocalAuthSessionFile(url, runtimeInstance) {
    if (!serverAuth.isLocalRequired()) {
      return;
    }

    const authorizationHeader = serverAuth.getAuthorizationHeader();
    if (!authorizationHeader) {
      return;
    }

    const sessionPayload = {
      version: 1,
      mode: serverAuth.mode,
      instanceId: runtimeInstance.id,
      pid: processObject.pid,
      url,
      apiPrefix,
      authorizationHeader,
      bootstrapUrl: serverAuth.createBootstrapUrl(url),
      createdAt: new Date().toISOString(),
    };

    dataRuntime.writeJsonAtomic(localAuthSessionFile, sessionPayload);

    if (processObject.env.TTDASH_AUTH_STATUS_FILE) {
      dataRuntime.writeJsonAtomic(processObject.env.TTDASH_AUTH_STATUS_FILE, sessionPayload);
    }
  }

  async function runStartupAutoLoad({ source = 'cli-auto-load' } = {}) {
    log('Auto-load enabled, starting import...');

    try {
      const result = await autoImportRuntime.performAutoImport({
        source,
        onCheck: (event) => {
          if (event.status === 'found') {
            log(`toktrack found (${event.method}, v${event.version})`);
          }
        },
        onProgress: (event) => {
          log(autoImportRuntime.formatAutoImportMessageEvent(event));
        },
        onOutput: (line) => {
          log(line);
        },
      });

      markStartupAutoLoadCompleted();
      log(`Auto-load complete: imported ${result.days} days, ${formatCurrency(result.totalCost)}.`);
    } catch (error) {
      errorLog(`Auto-load failed: ${error.message}`);
      errorLog('Dashboard will start without newly imported data.');
    }
  }

  return {
    describeDataFile,
    openBrowser,
    printStartupSummary,
    runStartupAutoLoad,
    shouldOpenBrowser,
    writeLocalAuthSessionFile,
  };
}

module.exports = {
  createStartupRuntime,
  formatCurrency,
  formatInteger,
};
