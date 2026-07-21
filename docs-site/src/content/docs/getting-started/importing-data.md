---
title: Import usage data
description: Load toktrack output, upload compatible JSON, or restore a TTDash usage backup safely.
---

TTDash supports three input shapes:

1. the array returned by `toktrack daily --json`
2. an object with a `daily` array using current toktrack field names
3. a legacy TTDash or `ccusage` object with `daily` entries and model breakdowns

Every accepted payload is normalized into TTDash's stored shape. Rows without a date are discarded, valid rows are sorted by date, and top-level totals are recalculated from normalized daily rows.

## Auto-import

Select **Auto import** in the empty-state onboarding or **Import** in the dashboard header after data has loaded. Both open **Toktrack auto import**. You can also run one import during startup:

```bash
ttdash --auto-load
```

TTDash chooses a compatible runner in this order:

1. the package-local `toktrack` executable, or `TTDASH_TOKTRACK_LOCAL_BIN`
2. `bunx` with the exact toktrack package version pinned by the TTDash release
3. `npx --yes` with the same package version and an isolated cache

A local executable is used only when `toktrack --version` matches the pinned version. The dashboard streams runner checks, progress, stderr, success, and structured failure messages while the import runs.

Only one auto-import can run per server process. Auto-import replaces the persisted dataset with the normalized result and records the source and load time. A startup auto-import failure is non-fatal: TTDash continues with the previous dataset or an empty state.

:::note
Auto-import can only see tools and source files available to the TTDash process. A container needs explicit read-only mounts and any additional tooling installed in a custom image.
:::

## Upload a complete JSON dataset

Use **Upload** when the selected file should become the complete current dataset.

- the file is normalized before it is stored
- it replaces `data.json`; it does not merge dates
- the JSON request body is limited to 10 MiB
- malformed JSON and unsupported shapes are rejected without replacing valid stored data

You can generate a current toktrack payload yourself:

```bash
toktrack daily --json > usage.json
```

Then select `usage.json` in TTDash. See [Data formats](/ttdash/reference/data-formats/) for field-level examples.

## Import a TTDash usage backup

Use **Settings → Maintenance → Back up data → Import data** when you want a conservative date merge:

- dates missing from the current dataset are added
- equivalent existing dates are skipped
- dates that exist with different values remain unchanged and are reported as conflicts
- invalid or dateless imported entries are counted as skipped

Choose ordinary **Upload** instead when the incoming file should replace the entire dataset.

## Verify the result

After any successful load:

1. check the displayed day count and total cost
2. set the date preset to **All**
3. inspect provider and model filters for unexpected names
4. open a recent period drilldown and confirm requests and token types
5. export a fresh usage backup before making large changes

The normalized dataset is also available through [`GET /api/usage`](/ttdash/reference/http-api/#get-apiusage).
