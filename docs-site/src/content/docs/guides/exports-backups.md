---
title: Exports and backups
description: Export filtered CSV and PDF reports, and back up or restore usage and settings safely.
---

TTDash separates presentation exports from recoverable backups. CSV and PDF reflect a dashboard selection; backups preserve the underlying usage or settings state.

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

The report request includes aggregation, selected month, provider and model filters, optional start/end dates, and language. The server returns an error when no usage data is available or Typst cannot be found.

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
