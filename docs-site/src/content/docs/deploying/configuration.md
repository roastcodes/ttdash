---
title: Configuration and CLI
description: Supported commands, options, environment variables, precedence, and storage paths.
---

Ordinary local use needs no configuration: start `ttdash` and use the generated local authentication URL.

## CLI syntax

```text
ttdash [options]
ttdash stop
```

| Option          | Aliases     | Default | Description                                                                              |
| --------------- | ----------- | ------- | ---------------------------------------------------------------------------------------- |
| `--port <port>` | `-p`        | `3000`  | Set the first port to try; valid values are integers from 1 through 65535                |
| `--help`        | `-h`        | —       | Print version, usage, options, and examples, then exit                                   |
| `--no-open`     | `-no`       | off     | Do not open a browser automatically                                                      |
| `--auto-load`   | `-al`       | off     | Run one auto-import during startup; failure does not prevent startup                     |
| `--background`  | `-b`, `-bg` | off     | Start a detached managed instance                                                        |
| `--docker`      | —           | off     | Bind with container defaults, disable browser opening, and require remote authentication |

When the requested port is occupied, TTDash tries the requested port and up to 100 following ports without exceeding `65535`. The startup summary prints the selected URL, API URL, bind host, storage files, authentication mode, and data status.

### Background instances

`ttdash --background` starts a detached child, waits for it to become reachable, and records its identity. Run `ttdash stop` to manage it:

- one live instance is stopped directly
- several live instances are listed for selection; an empty answer cancels
- stale registry entries are removed during inspection
- no live instance produces an informational result

Logs are stored in `background/` below the cache directory.

## Runtime environment variables

Boolean variables are enabled only by the literal value `1`.

| Variable                    | Default                                     | Description                                                                        |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PORT`                      | `3000`                                      | First server port to try; `--port` takes precedence                                |
| `HOST`                      | `127.0.0.1`; `0.0.0.0` in Docker mode       | Bind host; non-loopback values require explicit remote access                      |
| `NO_OPEN_BROWSER=1`         | off                                         | Disable automatic browser opening                                                  |
| `TTDASH_ALLOW_REMOTE=1`     | off                                         | Permit a non-loopback `HOST`; also requires a remote token                         |
| `TTDASH_REMOTE_TOKEN`       | unset                                       | Master token for remote/Docker authentication; minimum 24 characters               |
| `TTDASH_DOCKER=1`           | off                                         | Enable the same runtime behavior as `--docker`                                     |
| `TTDASH_TRUSTED_HOSTS`      | Docker loopback names; otherwise none added | Comma-separated exact DNS names or IP addresses accepted in browser `Host` headers |
| `TTDASH_SECURE_COOKIE=1`    | off                                         | Mark browser session cookies `Secure`; use only with HTTPS clients                 |
| `TTDASH_TRUST_PROXY=1`      | off                                         | Use the last valid `X-Forwarded-For` address for login rate limits                 |
| `TTDASH_DATA_DIR`           | platform default                            | Absolute directory containing `data.json`                                          |
| `TTDASH_CONFIG_DIR`         | platform default                            | Absolute directory containing settings, auth state, and background registry        |
| `TTDASH_CACHE_DIR`          | platform default                            | Absolute directory for package-runner cache and background logs                    |
| `TTDASH_TOKTRACK_LOCAL_BIN` | package-local executable                    | Explicit preferred toktrack path; version must match the pinned release            |

The three directory overrides can be set independently but must be absolute paths.

`TTDASH_PUBLISH_ADDRESS` is not a TTDash runtime variable. It is consumed by the repository's `compose.yaml` to choose the host-side publish address.

Variables used internally for subprocess coordination, tests, and package verification are not supported configuration APIs.

## Precedence and modes

- `--port` overrides `PORT`.
- `--docker` or `TTDASH_DOCKER=1` enables Docker mode.
- `HOST` overrides the mode's default bind host.
- `--no-open`, `NO_OPEN_BROWSER=1`, Docker mode, non-interactive output, and `CI` can each prevent browser opening.
- Docker mode permits its non-loopback bind but never removes token authentication.
- An explicit non-empty trusted-host list replaces the Docker loopback defaults instead of extending them.

## Storage locations

| Platform | Data                                      | Configuration                          | Cache                                |
| -------- | ----------------------------------------- | -------------------------------------- | ------------------------------------ |
| macOS    | `~/Library/Application Support/TTDash`    | same                                   | `~/Library/Caches/TTDash`            |
| Linux    | `${XDG_DATA_HOME:-~/.local/share}/ttdash` | `${XDG_CONFIG_HOME:-~/.config}/ttdash` | `${XDG_CACHE_HOME:-~/.cache}/ttdash` |
| Windows  | `%LOCALAPPDATA%\TTDash`                   | `%APPDATA%\TTDash`                     | `%LOCALAPPDATA%\TTDash\Cache`        |

The runtime uses:

- `data.json` for normalized usage
- `settings.json` for persisted preferences and data-load metadata
- `session-auth.json` for current local bootstrap authentication state
- `background-instances.json` for the managed-instance registry
- `background/` for background logs
- `npx-cache/` for the isolated npx fallback cache

At startup, a legacy repository-local `data.json` is migrated when the destination file does not yet exist.

## Examples

Local background instance on a preferred port:

```bash
ttdash --background --port 3010 --auto-load
```

Isolated storage:

```bash
TTDASH_DATA_DIR=/srv/ttdash/data \
TTDASH_CONFIG_DIR=/srv/ttdash/config \
TTDASH_CACHE_DIR=/srv/ttdash/cache \
ttdash --no-open
```

Remote access on a trusted LAN or VPN:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash --no-open
```

Read [Remote access and security](/ttdash/deploying/remote-access/) before exposing the service beyond loopback.
