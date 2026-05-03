const { StringDecoder } = require('node:string_decoder');

const DEFAULT_COMMAND_OUTPUT_MAX_BYTES = 1024 * 1024;
const DEFAULT_PROCESS_TERMINATION_GRACE_MS = 5000;

function createAutoImportCommandRunner({
  processObject = process,
  spawnCrossPlatform,
  isWindows,
  processTerminationGraceMs,
}) {
  const terminationGraceMs =
    typeof processTerminationGraceMs === 'number' &&
    Number.isFinite(processTerminationGraceMs) &&
    processTerminationGraceMs > 0
      ? processTerminationGraceMs
      : DEFAULT_PROCESS_TERMINATION_GRACE_MS;

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
      exitSignal = null,
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
    error.exitSignal = exitSignal;
    error.timedOut = timedOut;
    error.outputTruncated = outputTruncated;
    return error;
  }

  function getMaxOutputBytes(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_COMMAND_OUTPUT_MAX_BYTES;
  }

  function createCapturedOutputState() {
    return {
      bytes: 0,
      decoder: new StringDecoder('utf8'),
      truncated: false,
      value: '',
    };
  }

  function getUtf8SafePrefixLength(chunkBuffer, maxBytes) {
    let safeEnd = Math.min(maxBytes, chunkBuffer.length);
    while (safeEnd > 0 && (chunkBuffer[safeEnd] & 0b11000000) === 0b10000000) {
      safeEnd -= 1;
    }
    return safeEnd;
  }

  function appendCapturedOutput(state, chunkBuffer, maxOutputBytes) {
    const remainingBytes = maxOutputBytes - state.bytes;

    if (remainingBytes <= 0) {
      state.truncated = state.truncated || chunkBuffer.length > 0;
      return;
    }

    if (chunkBuffer.length > remainingBytes) {
      const safeEnd = getUtf8SafePrefixLength(chunkBuffer, remainingBytes);
      if (safeEnd > 0) {
        state.value += state.decoder.write(chunkBuffer.subarray(0, safeEnd));
      }
      state.bytes = maxOutputBytes;
      state.truncated = true;
      return;
    }

    state.bytes += chunkBuffer.length;
    state.value += state.decoder.write(chunkBuffer);
  }

  function flushCapturedOutput(state) {
    if (!state.truncated) {
      state.value += state.decoder.end();
    }
    return state.value;
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
    }, terminationGraceMs);
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

      const stdoutCapture = createCapturedOutputState();
      const stderrCapture = createCapturedOutputState();
      const stderrStreamDecoder = new StringDecoder('utf8');
      let stdout = '';
      let stderr = '';
      let outputTruncated = false;
      const capturedOutputMaxBytes = getMaxOutputBytes(maxOutputBytes);
      let finished = false;
      let timedOut = false;
      let timeoutId = null;
      let outputFinalized = false;

      const settle = (handler, value) => {
        if (finished) {
          return false;
        }
        finished = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        handler(value);
        return true;
      };

      const rejectFromCallbackError = (error) => {
        const callbackError = error instanceof Error ? error : new Error(String(error));
        const rejected = settle(reject, callbackError);
        if (rejected) {
          terminateChildProcess(child);
        }
        return false;
      };

      const emitStderrChunk = (chunkText) => {
        if (finished) {
          return false;
        }
        if (!streamStderr || !onStderr || !chunkText.trim()) {
          return true;
        }
        try {
          onStderr(chunkText);
          return true;
        } catch (error) {
          return rejectFromCallbackError(error);
        }
      };

      const finalizeOutput = () => {
        if (outputFinalized) {
          return true;
        }
        outputFinalized = true;
        stdout = flushCapturedOutput(stdoutCapture);
        stderr = flushCapturedOutput(stderrCapture);
        outputTruncated = stdoutCapture.truncated || stderrCapture.truncated;
        return emitStderrChunk(stderrStreamDecoder.end());
      };

      if (signalOnClose) {
        signalOnClose(() => terminateChildProcess(child));
      }

      if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          terminateChildProcess(child);
        }, timeoutMs);
        timeoutId.unref?.();
      }

      child.stdout.on('data', (chunk) => {
        if (finished) {
          return;
        }
        appendCapturedOutput(stdoutCapture, chunk, capturedOutputMaxBytes);
      });

      child.stderr.on('data', (chunk) => {
        if (finished) {
          return;
        }
        appendCapturedOutput(stderrCapture, chunk, capturedOutputMaxBytes);
        emitStderrChunk(stderrStreamDecoder.write(chunk));
      });

      child.on('error', (error) => {
        if (!finalizeOutput()) {
          return;
        }
        settle(
          reject,
          createCommandError(error.message || `Could not start ${commandLabel}.`, {
            command,
            args,
            stdout,
            stderr,
            outputTruncated,
          }),
        );
      });
      child.on('close', (code, signal) => {
        if (finished) {
          return;
        }
        if (!finalizeOutput()) {
          return;
        }
        if (timedOut) {
          settle(
            reject,
            createCommandError(`Command timed out after ${timeoutMs}ms: ${commandLabel}`, {
              command,
              args,
              stdout,
              stderr,
              exitCode: code,
              exitSignal: signal ?? null,
              timedOut: true,
              outputTruncated,
            }),
          );
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
              exitSignal: signal ?? null,
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
