---
title: Exports and backups
description: Export filtered CSV and PDF reports, and back up or restore usage and settings safely.
---

TTDash separates presentation exports, recoverable backups, and system-transfer files. CSV and PDF reflect a dashboard selection; backups preserve local usage or settings state; system transfers add another computer to a combined dashboard without merging its stored dates into `data.json`.

## CSV export

CSV export downloads the currently filtered and aggregated rows. The selected date range, providers, models, and daily/monthly/yearly view all apply.

Use CSV when you want to:

- continue analysis in a spreadsheet
- archive a reporting-period summary
- compare the displayed aggregation with another system

CSV export does not change stored data and is not a full-fidelity usage backup.

## PDF reporting

PDF export sends the current selection to the local server, which reads the persisted dataset and renders a localized report with [Typst](https://typst.app/).

Install Typst in the same environment that runs TTDash:

```bash
typst --version
```

The report request includes aggregation, selected systems, selected month, provider and model filters, optional start/end dates, and language. The server returns an error when no usage data is available or Typst cannot be found.

:::caution
The standard TTDash Docker image does not include Typst. Add it in a derived image if PDF export is required in a container.
:::

## Usage backups

A usage backup contains the normalized `daily` dataset and computed `totals`. Export one before replacing data or migrating storage.

Importing a usage backup is conservative:

- new dates are added
- equivalent dates are skipped
- conflicting dates are preserved from the current dataset and reported

To intentionally replace every existing date, use the normal JSON upload instead.

Usage backups always contain the destination computer's local dataset. They do not include imported systems. This keeps restore semantics stable and prevents a combined dataset from being imported back into one host accidentally.

## System-transfer exports

A system-transfer export is a snapshot of the local host in a `ttdash-system-export` envelope. Its deterministic filename is `ttdash-system-<hostname>.json`; there is no timestamp, so a scheduled export can overwrite the previous snapshot safely.

Use **Settings → Maintenance → Transfer systems → Export this system**, or run:

```bash
ttdash --export [path]
```

With no path, TTDash writes to the user's Downloads directory. A directory path receives the deterministic filename. A path ending in `.json` is used as the exact file path. Existing files are atomically replaced.

`ttdash --auto-load --export [path]` runs the toktrack auto-import first, writes the export, and exits without starting the HTTP server. `--export` cannot be combined with background mode or `stop`.

On the destination, select several transfer files in one import operation. Existing hostnames produce one replace/skip decision. Imported files are normalized, stored independently, and included in system filtering, aggregate totals, CSV, and PDF views. See [Import usage data](/ttdash/getting-started/importing-data/#combine-usage-from-several-systems).

## Settings backups

A settings backup contains persisted preferences such as language, theme, motion behavior, provider limits, default filters, section visibility, and section order.

Importing settings replaces the persisted settings after normalization. Runtime-only status, session cookies, remote master tokens, and background process identity are not user settings and are not part of this backup.

## A practical backup routine

1. Export usage and settings backups separately.
2. Store them in a location protected according to the sensitivity of your usage data.
3. Record the TTDash release used to create the backups.
4. Test restoration into an isolated TTDash data/config directory.
5. Keep at least one older known-good backup before rotating files.

Use absolute `TTDASH_DATA_DIR`, `TTDASH_CONFIG_DIR`, and `TTDASH_CACHE_DIR` overrides for an isolated restore test. See [Configuration and CLI](/ttdash/deploying/configuration/#storage-locations).
