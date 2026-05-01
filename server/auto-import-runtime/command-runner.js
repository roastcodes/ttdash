function createAutoImportCommandRunner({
  processObject = process,
  spawnCrossPlatform,
  isWindows,
  processTerminationGraceMs,
}) {
  function getExecutableName(baseName, forceWindows = isWindows) {
    if (!forceWindows) {
      return baseName;
    }

    switch (baseName) {
      case 'npm':
        return 'npm.cmd';
      case 'bun':
      case 'bunx':
        return 'bun.exe';
      case 'npx':
        return 'npx.cmd';
      default:
        return baseName;
    }
  }

  function spawnCommand(command, args, options = {}) {
    return spawnCrossPlatform(command, args, {
      ...options,
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

  function formatCommandForDisplay(command, args = []) {
    return [command, ...args].join(' ').trim();
  }

  function createCommandError(
    message,
    { command, args = [], stdout = '', stderr = '', exitCode = null, timedOut = false } = {},
  ) {
    const error = new Error(message);
    error.command = command;
    error.args = args;
    error.stdout = stdout;
    error.stderr = stderr;
    error.exitCode = exitCode;
    error.timedOut = timedOut;
    return error;
  }

  function terminateChildProcess(child) {
    if (!child || child.exitCode !== null) {
      return;
    }

    child.kill('SIGTERM');

    const forceKillTimeout = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, processTerminationGraceMs);
    forceKillTimeout.unref?.();

    child.once('close', () => {
      clearTimeout(forceKillTimeout);
    });
  }

  function runCommand(
    command,
    args,
    {
      env = processObject.env,
      streamStderr = false,
      onStderr,
      signalOnClose,
      timeoutMs = null,
    } = {},
  ) {
    return runCommandWithSpawn(command, args, {
      env,
      streamStderr,
      onStderr,
      signalOnClose,
      timeoutMs,
      spawnImpl: spawnCommand,
    });
  }

  function runCommandWithSpawn(
    command,
    args,
    {
      env = processObject.env,
      streamStderr = false,
      onStderr,
      signalOnClose,
      timeoutMs = null,
      spawnImpl = spawnCommand,
    } = {},
  ) {
    return new Promise((resolve, reject) => {
      const commandLabel = formatCommandForDisplay(command, args);
      let child;

      try {
        child = spawnImpl(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env,
        });
      } catch (error) {
        reject(
          createCommandError(error?.message || `Could not start ${commandLabel}.`, {
            command,
            args,
          }),
        );
        return;
      }

      let stdout = '';
      let stderr = '';
      let finished = false;
      let timeoutId = null;
      let timeoutError = null;

      const settle = (handler, value) => {
        if (finished) {
          return;
        }
        finished = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        handler(value);
      };

      if (signalOnClose) {
        signalOnClose(() => terminateChildProcess(child));
      }

      if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          timeoutError = createCommandError(
            `Command timed out after ${timeoutMs}ms: ${commandLabel}`,
            {
              command,
              args,
              stdout,
              stderr,
              timedOut: true,
            },
          );
          terminateChildProcess(child);
        }, timeoutMs);
        timeoutId.unref?.();
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

      child.on('error', (error) =>
        settle(
          reject,
          createCommandError(error.message || `Could not start ${commandLabel}.`, {
            command,
            args,
            stdout,
            stderr,
          }),
        ),
      );
      child.on('close', (code) => {
        if (finished) {
          return;
        }
        if (timeoutError) {
          settle(reject, timeoutError);
          return;
        }
        if (code === 0) {
          settle(resolve, stdout.trimEnd());
          return;
        }
        settle(
          reject,
          createCommandError(
            stderr.trim() || stdout.trim() || `Command exited with code ${code}: ${commandLabel}`,
            {
              command,
              args,
              stdout,
              stderr,
              exitCode: code,
            },
          ),
        );
      });
    });
  }

  return {
    commandExists,
    createCommandError,
    formatCommandForDisplay,
    getExecutableName,
    runCommand,
    runCommandWithSpawn,
    spawnCommand,
    terminateChildProcess,
  };
}

module.exports = {
  createAutoImportCommandRunner,
};
