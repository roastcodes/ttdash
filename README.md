# TTDash

[![CI](https://github.com/roastcodes/ttdash/actions/workflows/ci.yml/badge.svg)](https://github.com/roastcodes/ttdash/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40roastcodes%2Fttdash)](https://www.npmjs.com/package/@roastcodes/ttdash)
[![License](https://img.shields.io/github/license/roastcodes/ttdash)](LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)

TTDash is a local-first dashboard and CLI for [`toktrack`](https://github.com/mag123c/toktrack) usage data. It turns local AI usage exports into cost, token, request, model, and provider analysis without sending your data to a hosted TTDash backend.

![TTDash dashboard](docs/ttdash-dashboard.png)

## Why TTDash

- Review costs, tokens, requests, cache use, and model/provider mix in one dashboard.
- Import current `toktrack` output or legacy `ccusage`-style daily JSON.
- Filter by date, month, provider, model, and daily/monthly/yearly aggregation.
- Explore forecasts, anomalies, comparisons, concentration, limits, and efficiency.
- Export the current view as CSV or, with Typst installed, as PDF.
- Keep usage data, settings, and backups on your machine by default.
- Run interactively, in the background, remotely with authentication, or in Docker.

TTDash builds on the data produced by `toktrack`. Thanks to [mag123c](https://github.com/mag123c) for creating and maintaining it.

## Requirements

- Node.js 20 or newer for npm/npx installations
- A modern browser
- npm or Bun for auto-import fallback execution
- [Typst](https://typst.app/) only for PDF export
- Docker with Compose v2 only for container deployments

## Quick Start

Run the latest published package without installing it globally:

```bash
npx --yes @roastcodes/ttdash@latest
```

Or use Bun:

```bash
bunx @roastcodes/ttdash@latest
```

TTDash starts on `http://127.0.0.1:3000`, retries up to the next 100 ports when necessary, and opens a browser when the terminal supports it. On first use, choose one of these paths:

1. Select **Auto-Import** to run the pinned `toktrack` version.
2. Upload a `toktrack daily --json` result.
3. Upload a legacy TTDash/`ccusage` daily JSON export.
4. Import an existing usage backup from **Settings**.

See the [usage guide](docs/usage.md) for accepted formats, dashboard controls, exports, backups, and shortcuts.

## Installation

### Global npm installation

```bash
npm install --global @roastcodes/ttdash
ttdash
```

### Global Bun installation

```bash
bun add --global @roastcodes/ttdash
ttdash
```

Verify either package runner without starting the server:

```bash
npx --yes @roastcodes/ttdash@latest --help
bunx @roastcodes/ttdash@latest --help
```

For source installations, see [Development and source installation](#development-and-source-installation).

## Common Commands

```bash
# Choose the first port to try.
ttdash --port 3010

# Do not open a browser.
ttdash --no-open

# Import toktrack data during startup.
ttdash --auto-load

# Run as a managed background process.
ttdash --background

# Stop a running background instance; select one if several are active.
ttdash stop

# Enable container-safe runtime defaults for a custom container entrypoint.
TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)" ttdash --docker
```

Flags can be combined:

```bash
ttdash --background --port 3010 --auto-load
ttdash --background --no-open
```

The corresponding environment-variable form is useful for services and containers:

```bash
PORT=3010 NO_OPEN_BROWSER=1 ttdash
```

The full option, alias, environment, precedence, and storage-path reference is in [`docs/configuration.md`](docs/configuration.md).

## CLI Reference

```text
ttdash [options]
ttdash stop
```

| Option          | Aliases     | Purpose                                                      |
| --------------- | ----------- | ------------------------------------------------------------ |
| `--port <port>` | `-p`        | Set the first port to try; valid range is 1–65535            |
| `--help`        | `-h`        | Print version, usage, options, and examples                  |
| `--no-open`     | `-no`       | Disable automatic browser opening                            |
| `--auto-load`   | `-al`       | Run auto-import once during startup                          |
| `--background`  | `-b`, `-bg` | Start a managed background instance                          |
| `--docker`      | —           | Enable explicit container defaults and remote authentication |

`ttdash stop` prunes stale entries, stops the only active background instance automatically, or prompts when multiple instances are running. Background logs and the instance registry are stored under the platform-specific TTDash cache and configuration directories.

## Dashboard Workflows

TTDash includes:

- KPI summaries for the selected range, today, and the current month
- cost, request, token, cache, model, provider, weekday, and calendar views
- month-end cost forecasts, provider forecasts, cache ROI, and provider limits
- period comparisons, anomaly detection, distributions, correlations, and concentration risk
- sortable provider, model, and recent-period tables with drilldowns
- daily, monthly, and yearly views plus preset and custom date ranges
- provider and model filters with persisted defaults
- configurable section visibility and ordering, theme, language, and motion preferences
- command palette (`Ctrl+K`/`Cmd+K`), numeric quick selection, help, and keyboard navigation
- CSV export of the filtered view and localized PDF reports
- settings and usage backup import/export

![TTDash analytics](docs/ttdash-dashboard-analytics.png)

![TTDash settings](docs/ttdash-dashboard-settings.png)

The [usage guide](docs/usage.md) explains how replacement uploads differ from non-destructive backup imports and how filters affect exports and reports.

## Remote Access

The default loopback server still requires a generated per-start local session token, but TTDash places that token in its one-time bootstrap URL and opens it automatically. For a non-loopback bind, you must deliberately enable remote access and provide a token of at least 24 characters:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash
```

Open the server's LAN/VPN address and enter the token in the sign-in screen. API clients authenticate with either supported header:

```bash
curl \
  -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  http://192.0.2.10:3000/api/usage

curl \
  -H "X-TTDash-Remote-Token: $TTDASH_REMOTE_TOKEN" \
  http://192.0.2.10:3000/api/usage
```

Use remote HTTP only on a trusted LAN, VPN, or SSH tunnel. Public hostnames require an HTTPS reverse proxy; do not send the token or session over public HTTP. Read the [configuration guide](docs/configuration.md), [API guide](docs/api.md), and [security policy](SECURITY.md) before exposing TTDash beyond loopback.

## Docker

The repository includes a multi-stage Alpine image and a hardened Compose service. For localhost-only access:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build -d
```

Open `http://127.0.0.1:3000` and enter the same token. The Compose default publishes only to host loopback and persists data, settings, and cache in the `ttdash-data` volume.

For server publishing, trusted hosts, HTTPS proxies, direct `docker run`, mounted auto-import sources, health checks, and the image's Typst limitation, use the complete [Docker guide](docs/docker.md).

## Data, Storage, and Privacy

TTDash has no hosted backend, remote database, analytics, tracking, or third-party fonts. It does contact the npm registry when it needs the pinned `toktrack` package or checks the latest `toktrack` version.

Default directories:

| Platform | Usage data                                 | Settings                                | Cache and background logs             |
| -------- | ------------------------------------------ | --------------------------------------- | ------------------------------------- |
| macOS    | `~/Library/Application Support/TTDash/`    | same directory                          | `~/Library/Caches/TTDash/`            |
| Linux    | `${XDG_DATA_HOME:-~/.local/share}/ttdash/` | `${XDG_CONFIG_HOME:-~/.config}/ttdash/` | `${XDG_CACHE_HOME:-~/.cache}/ttdash/` |
| Windows  | `%LOCALAPPDATA%\TTDash\`                   | `%APPDATA%\TTDash\`                     | `%LOCALAPPDATA%\TTDash\Cache\`        |

Usage is stored as `data.json`; settings are stored as `settings.json`. TTDash creates application directories with restrictive permissions where the platform supports them. Absolute path overrides and the Docker layout are documented in the [configuration guide](docs/configuration.md).

### Claude Code history retention

Claude Code removes old sessions after 30 days by default. To preserve a longer history for `toktrack`, configure its retention in `~/.claude/settings.json`, for example:

```json
{
  "cleanupPeriodDays": 9999999999
}
```

## Troubleshooting

### `ttdash` is not found

Ensure the global npm or Bun binary directory is in `PATH`. For Bun, check:

```bash
echo "$PATH"
ls -la ~/.bun/bin/ttdash
```

### The expected port is busy

TTDash tries the requested port and up to 100 following ports, capped at 65535. Check the startup summary for the selected URL or choose another starting port:

```bash
ttdash --port 3010
```

### Auto-import cannot run

Ensure npm or Bun is available in the same environment as TTDash. To force a specific compatible executable, set `TTDASH_TOKTRACK_LOCAL_BIN` to an absolute binary path. Container auto-import can only read sources mounted into the container.

### PDF export fails

Install Typst and confirm `typst --version` works in the same environment. The standard Docker image intentionally does not contain Typst.

### Remote access reports an untrusted host

Set `TTDASH_TRUSTED_HOSTS` to the exact DNS names or IP addresses used by browsers. Do not include a scheme, port, path, or wildcard. See [Docker deployment scenarios](docs/docker.md#deployment-scenarios).

More diagnostics are available in the [usage](docs/usage.md), [configuration](docs/configuration.md), and [Docker](docs/docker.md) guides. Bugs and support questions can be opened in [GitHub Issues](https://github.com/roastcodes/ttdash/issues); report vulnerabilities privately as described in [`SECURITY.md`](SECURITY.md).

## Development and Source Installation

Clone the repository, then install and run the frontend and API server separately:

```bash
npm install
npm run dev
```

In another terminal:

```bash
node server.js
```

- Vite frontend: `http://localhost:5173`
- API and production static server: `http://localhost:3000`

Build and run the main local quality gate:

```bash
npm run build
npm run verify
```

Before a pull request, run the full browser-inclusive gate:

```bash
npm run verify:full
```

Source installation helpers remain available for macOS/Linux (`sh install.sh`) and Windows (`install.bat`). See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/testing.md`](docs/testing.md) for the full development workflow and test matrix.

To install a built checkout globally without the helper scripts:

```bash
npm install
npm run build
npm install --global .
```

Or with Bun:

```bash
bun install
bun run build
bun add --global "file:$(pwd)"
```

## Project Documentation

- [Usage guide](docs/usage.md)
- [Configuration reference](docs/configuration.md)
- [Docker guide](docs/docker.md)
- [HTTP API reference](docs/api.md)
- [Architecture guardrails](docs/architecture.md)
- [Testing architecture](docs/testing.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Release process](RELEASING.md)
- [Changelog](CHANGELOG.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

TTDash is available under the [MIT License](LICENSE).
