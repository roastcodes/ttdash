# Usage Guide

This guide covers importing data, navigating the dashboard, saving preferences, and exporting or restoring local state.

## Load Usage Data

TTDash accepts three daily usage shapes:

- the array returned by `toktrack daily --json`
- an object with a `daily` array in the current toktrack field format
- a legacy TTDash/`ccusage` object with `daily`, `totals`, and model breakdowns

The repository includes [`examples/sample-usage.json`](../examples/sample-usage.json) as a small upload example. Incoming days without a date are discarded, valid days are sorted by date, and totals are recalculated from normalized daily data.

### Auto-Import

Use **Auto-Import** in the dashboard or start with `ttdash --auto-load`. TTDash looks for a compatible runner in this order:

1. the package-local `toktrack` executable, or `TTDASH_TOKTRACK_LOCAL_BIN` when configured
2. `bunx` with the exact `toktrack` package spec pinned by the current TTDash release
3. `npx --yes` with that same pinned package spec and an isolated cache

A local executable is used only when its reported version matches the version pinned by TTDash. Only one auto-import can run per server process. The dashboard shows runner checks, progress, stderr, success, and structured failure messages.

Auto-import replaces the persisted dataset with the normalized result and records the load time and source. Startup auto-import failure is non-fatal: TTDash starts with the previously stored data or an empty state.

### Upload a JSON file

Use **Upload** for a complete current dataset. Upload normalizes the file and replaces `data.json`; it does not merge by date. JSON request bodies are limited to 10 MiB.

### Import a usage backup

Use **Settings → Backups** to merge a TTDash usage backup conservatively:

- missing dates are added
- equivalent existing dates are skipped
- conflicting existing dates remain unchanged and are reported

Use normal upload, not backup import, when the incoming file should replace the current dataset.

## Navigate and Filter

The filter bar supports:

- daily, monthly, and yearly aggregation
- all-time, 7-day, 30-day, current-month, and current-year presets
- a specific month
- an inclusive custom start/end date range
- one or more providers
- one or more models

Filters apply to dashboard metrics, charts, tables, CSV export, and PDF request state. **Reset filters** returns to the saved defaults. Default view, date preset, providers, and models can be changed in **Settings**.

Charts and tables expose expanded views or drilldowns where applicable. Cost and request time-series points open a period drilldown; recent-period rows can be opened with a pointer, `Enter`, or `Space`. Drilldowns support left/right arrow navigation between available periods.

## Dashboard Sections

The dashboard groups its analysis into configurable sections:

- insights and headline metrics
- today's and current-month metrics
- cost/request/token activity calendars
- forecasts, cache ROI, and request quality
- provider subscriptions and monthly limits
- cost, token, and request analysis
- distributions, correlations, and concentration risk
- period comparisons and anomaly detection
- provider, model, and recent-period tables

In **Settings**, each section can be shown, hidden, and reordered. Settings also control theme, German/English language, reduced-motion behavior, provider subscription/limit values, and default filters.

## Command Palette and Keyboard Use

Open the command palette with `Ctrl+K` on Windows/Linux or `Cmd+K` on macOS. It provides dashboard actions, filter and view changes, section navigation, theme/language changes, settings, and help. When the palette is closed and no text field is active, its numbered quick actions can be selected with number keys.

Common keyboard behavior:

- `Escape`: close a dialog, expanded chart, or command palette
- arrow keys: navigate date grids, tabs, drilldown periods, and supported table/calendar controls
- `Enter` or `Space`: activate focused interactive rows and controls
- `?`: open help through the command palette shortcut set

## Export and Reporting

### CSV

CSV export downloads the currently filtered and aggregated dashboard rows. It does not alter stored data.

### PDF

PDF reporting sends the current view mode, month, providers, models, date range, and language to the local server. The server reads the stored dataset and generates a localized report with Typst.

Install Typst separately and ensure `typst --version` succeeds in the environment running TTDash. The standard Docker image does not include Typst; PDF export there requires a custom image.

## Settings and Backups

TTDash persists settings in `settings.json`. The settings backup includes normalized persisted preferences, while the usage backup contains the stored normalized dataset. Runtime-only status such as whether CLI auto-load is active is not persisted as a user preference.

Settings backup import replaces persisted settings after validation. Usage backup import uses the conservative date merge described above. Resetting settings deletes `settings.json` and recreates normalized defaults; deleting usage removes `data.json` after confirmation.

See the [configuration reference](configuration.md) for platform paths and overrides.

## Container Considerations

JSON upload and backup import work without access to host usage sources. Auto-import only sees files and tools available inside the container, so mount required usage sources and install any extra tooling in a custom image. Persistent state must use the `/data` volume. See the [Docker guide](docker.md).

## Troubleshooting

- **Empty dashboard:** upload a supported JSON file or run Auto-Import and inspect its progress details.
- **Local toktrack version mismatch:** let TTDash use its pinned bunx/npx fallback or install the matching version.
- **Corrupt stored data/settings:** the API reports the affected file as unreadable; recover from a backup or move the identified file before restarting.
- **No PDF:** install Typst in the server environment, not only on the browser machine.
- **Remote login reappears:** the HttpOnly browser session expired or was evicted; sign in with the remote token again.
- **Unexpected port:** read the startup summary; TTDash may have selected the next available port.
