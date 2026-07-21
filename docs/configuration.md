# Configuration Reference

This reference covers supported TTDash CLI options, runtime environment variables, precedence, and storage paths. For ordinary local use, start `ttdash` without configuration.

## CLI Syntax

```text
ttdash [options]
ttdash stop
```

| Option          | Aliases     | Default | Description                                                                                                               |
| --------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--port <port>` | `-p`        | `3000`  | Set the first port to try. Values must be integers from 1 through 65535.                                                  |
| `--help`        | `-h`        | —       | Print version, usage, options, and examples, then exit.                                                                   |
| `--no-open`     | `-no`       | off     | Do not open the browser automatically.                                                                                    |
| `--auto-load`   | `-al`       | off     | Run one auto-import during startup. A failure does not prevent the dashboard from starting.                               |
| `--background`  | `-b`, `-bg` | off     | Start a detached instance and register it for `ttdash stop`.                                                              |
| `--docker`      | —           | off     | Enable container defaults: bind to `0.0.0.0`, allow the bind, disable browser opening, and require remote authentication. |

When a requested port is occupied, TTDash tries up to 100 consecutive ports without exceeding 65535. The startup summary prints the selected URL, API URL, bind host, storage files, authentication mode, and data status.

### Background instances

`ttdash --background` starts a child process, waits for it to become reachable, and records its identity. `ttdash stop` behaves as follows:

- no live instance: reports that nothing is running
- one live instance: stops it directly
- multiple live instances: lists them and asks which instance to stop; an empty answer cancels

Stale registry entries are removed when instances are inspected. Logs live below the cache directory in `background/`.

## Runtime Environment Variables

Boolean variables are enabled only by the literal value `1`.

| Variable                    | Default                                                            | Description                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                      | `3000`                                                             | First server port to try. `--port` takes precedence.                                                                                                           |
| `HOST`                      | `127.0.0.1`; `0.0.0.0` in Docker mode                              | Server bind host. Non-loopback values require explicit remote access.                                                                                          |
| `NO_OPEN_BROWSER=1`         | off                                                                | Disable automatic browser opening. Equivalent to `--no-open`.                                                                                                  |
| `TTDASH_ALLOW_REMOTE=1`     | off                                                                | Permit a non-loopback `HOST`. Also requires `TTDASH_REMOTE_TOKEN`. Docker mode supplies this opt-in.                                                           |
| `TTDASH_REMOTE_TOKEN`       | unset                                                              | Master token for non-loopback/Docker authentication. It must contain at least 24 characters.                                                                   |
| `TTDASH_DOCKER=1`           | off                                                                | Enable the same runtime behavior as `--docker`.                                                                                                                |
| `TTDASH_TRUSTED_HOSTS`      | Docker: `localhost,127.0.0.1,::1`; otherwise no additional entries | Comma-separated exact DNS names or IP addresses accepted in browser `Host` headers. An explicit value replaces Docker defaults.                                |
| `TTDASH_SECURE_COOKIE=1`    | off                                                                | Add `Secure` to browser session cookies. Enable only when clients use HTTPS.                                                                                   |
| `TTDASH_TRUST_PROXY=1`      | off                                                                | Use the last valid `X-Forwarded-For` address for per-client login rate limits. Enable only when a trusted proxy is the sole ingress and overwrites that value. |
| `TTDASH_DATA_DIR`           | platform default                                                   | Absolute directory containing `data.json`.                                                                                                                     |
| `TTDASH_CONFIG_DIR`         | platform default                                                   | Absolute directory containing `settings.json`, local authentication state, and the background registry.                                                        |
| `TTDASH_CACHE_DIR`          | platform default                                                   | Absolute directory for the isolated npx cache and background logs.                                                                                             |
| `TTDASH_TOKTRACK_LOCAL_BIN` | package-local executable                                           | Absolute or explicit path to a preferred `toktrack` executable. Its version must match the version pinned by TTDash.                                           |

The three `TTDASH_*_DIR` overrides must be absolute paths. They can be set independently; an unset path continues to use its platform default.

`TTDASH_PUBLISH_ADDRESS` is not a TTDash runtime variable. It is a substitution used by the repository's `compose.yaml` to select the host-side publish address.

Variables used internally for child-process coordination, test isolation, and package verification are not supported configuration APIs.

## Precedence and Modes

- `--port` overrides `PORT`.
- `--docker` or `TTDASH_DOCKER=1` enables Docker mode.
- `HOST` overrides the mode's default bind host.
- `--no-open`, `NO_OPEN_BROWSER=1`, Docker mode, non-interactive output, and `CI` can each prevent browser opening.
- Docker mode permits its non-loopback bind, but never removes token authentication.
- An explicit non-empty `TTDASH_TRUSTED_HOSTS` list replaces, rather than extends, the Docker host defaults.

## Storage Locations

| Platform | Data directory                            | Configuration directory                | Cache directory                      |
| -------- | ----------------------------------------- | -------------------------------------- | ------------------------------------ |
| macOS    | `~/Library/Application Support/TTDash`    | same                                   | `~/Library/Caches/TTDash`            |
| Linux    | `${XDG_DATA_HOME:-~/.local/share}/ttdash` | `${XDG_CONFIG_HOME:-~/.config}/ttdash` | `${XDG_CACHE_HOME:-~/.cache}/ttdash` |
| Windows  | `%LOCALAPPDATA%\TTDash`                   | `%APPDATA%\TTDash`                     | `%LOCALAPPDATA%\TTDash\Cache`        |

Files and subdirectories include:

- `data.json`: normalized usage data
- `settings.json`: persisted settings and data-load metadata
- `session-auth.json`: current local bootstrap authentication state
- `background-instances.json`: managed background instance registry
- `background/`: background logs below the cache directory
- `npx-cache/`: isolated cache used by the npx auto-import fallback

At startup, a legacy repository-local `data.json` is migrated into the data directory when no destination file exists.

## Local and Remote Authentication

Local loopback starts generate a random session token on every start. TTDash opens a bootstrap URL containing that token, exchanges it for an HttpOnly, SameSite cookie, and removes the token from the address. When browser opening is disabled, the startup summary prints the local authentication URL.

Non-loopback and Docker starts require `TTDASH_REMOTE_TOKEN`. The browser sign-in exchanges the master token for a random session cookie valid for up to 12 hours. The master token is not accepted in a remote query string and is not stored in browser storage. API clients should send a token header on every request; see the [API reference](api.md).

## Examples

Local background instance on a preferred port:

```bash
ttdash --background --port 3010 --auto-load
```

Remote access on a trusted LAN or VPN:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash --no-open
```

Isolated storage:

```bash
TTDASH_DATA_DIR=/srv/ttdash/data \
TTDASH_CONFIG_DIR=/srv/ttdash/config \
TTDASH_CACHE_DIR=/srv/ttdash/cache \
ttdash --no-open
```

Read the [Docker guide](docker.md) for container deployment and [`SECURITY.md`](../SECURITY.md) before exposing TTDash beyond loopback.
