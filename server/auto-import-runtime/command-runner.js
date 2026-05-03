const DEFAULT_COMMAND_OUTPUT_MAX_BYTES = 1024 * 1024;

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
    {
      command,
      args = [],
      stdout = '',
      stderr = '',
      exitCode = null,
      timedOut = false,
      outputTruncated = false,
    } = {},
  ) {
    const error = new Error(message);
    error.command = command;
    error.args = args;
    error.stdout = stdout;
    error.stderr = stderr;
    error.exitCode = exitCode;
    error.timedOut = timedOut;
    error.outputTruncated = outputTruncated;
    return error;
  }

  function getMaxOutputBytes(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_COMMAND_OUTPUT_MAX_BYTES;
  }

  function appendCapturedOutput(currentValue, currentBytes, chunk, maxOutputBytes) {
    const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    const remainingBytes = maxOutputBytes - currentBytes;

    if (remainingBytes <= 0) {
      return {
        bytes: currentBytes,
        truncated: chunkBuffer.length > 0,
        value: currentValue,
      };
    }

    if (chunkBuffer.length > remainingBytes) {
      let safeEnd = remainingBytes;
      while (safeEnd > 0 && (chunkBuffer[safeEnd] & 0b11000000) === 0b10000000) {
        safeEnd -= 1;
      }

      return {
        bytes: maxOutputBytes,
        truncated: true,
        value: currentValue + chunkBuffer.subarray(0, safeEnd).toString(),
      };
    }

    return {
      bytes: currentBytes + chunkBuffer.length,
      truncated: false,
      value: currentValue + chunkBuffer.toString(),
    };
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
      maxOutputBytes = DEFAULT_COMMAND_OUTPUT_MAX_BYTES,
    } = {},
  ) {
    return runCommandWithSpawn(command, args, {
      env,
      streamStderr,
      onStderr,
      signalOnClose,
      timeoutMs,
      maxOutputBytes,
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
      maxOutputBytes = DEFAULT_COMMAND_OUTPUT_MAX_BYTES,
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
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let outputTruncated = false;
      const capturedOutputMaxBytes = getMaxOutputBytes(maxOutputBytes);
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
              outputTruncated,
            },
          );
          terminateChildProcess(child);
        }, timeoutMs);
        timeoutId.unref?.();
      }

      child.stdout.on('data', (chunk) => {
        const nextStdout = appendCapturedOutput(stdout, stdoutBytes, chunk, capturedOutputMaxBytes);
        stdout = nextStdout.value;
        stdoutBytes = nextStdout.bytes;
        outputTruncated = outputTruncated || nextStdout.truncated;
      });

      child.stderr.on('data', (chunk) => {
        const line = chunk.toString();
        const nextStderr = appendCapturedOutput(stderr, stderrBytes, chunk, capturedOutputMaxBytes);
        stderr = nextStderr.value;
        stderrBytes = nextStderr.bytes;
        outputTruncated = outputTruncated || nextStderr.truncated;
        if (streamStderr && onStderr && line.trim()) {
          onStderr(line);
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
            outputTruncated,
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
              outputTruncated,
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
