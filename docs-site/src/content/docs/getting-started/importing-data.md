---
title: Import usage data
description: Load toktrack output, upload compatible JSON, or restore a TTDash usage backup safely.
---

TTDash supports three input shapes:

1. the array returned by `toktrack daily --json`
2. an object with a `daily` array using current toktrack field names
3. a legacy TTDash or `ccusage` object with `daily` entries and model breakdowns

Every accepted payload is normalized into TTDash's stored shape. Rows without a date are discarded, valid rows are sorted by date, and top-level totals are recalculated from normalized daily rows.

System-transfer files are a separate, versioned format. Import them through **Settings → Maintenance → Transfer systems**, not through the ordinary upload or backup-import actions.

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

## Combine usage from several systems

Create a system export on every source computer, then import those files on the computer that should show the combined view. A system export contains only the local computer's `data.json`; previously imported systems are never nested into a new export.

In the dashboard:

1. Open **Settings → Maintenance → Transfer systems** on the source system.
2. Select **Export this system**. The filename contains the source hostname and no timestamp.
3. Move the JSON file to the destination system.
4. Open the same settings section and select **Import system files**. The file picker accepts several files at once.
5. If one or more hostnames already exist, choose once whether to **Replace all** conflicting files or **Skip all** of them.

Imported systems remain separate files below TTDash's `systems/` data directory. TTDash combines their normalized daily rows only while producing the dashboard view. When at least two systems are available, the filter bar can show all systems or a selected subset; that selection can also be saved as a default filter.

If an imported file is later corrupted outside TTDash, it is skipped so the remaining dashboard continues to load. Maintenance settings show the unreadable filename and allow the complete additional-system collection to be removed safely.

You cannot import an export whose hostname matches the destination computer, because local usage remains owned by `data.json`. Remove one additional system or all additional systems from the transfer settings. A full usage reset deletes local data and every imported-system file.

The same source export is available from the command line:

```bash
ttdash --export
ttdash --export /srv/ttdash-transfers
ttdash --auto-load --export /srv/ttdash-transfers
```

The last command refreshes local toktrack data before exporting it. See [Configuration and CLI](/ttdash/deploying/configuration/#cli-syntax) for path rules.

## Verify the result

After any successful load:

1. check the displayed day count and total cost
2. set the date preset to **All**
3. inspect provider and model filters for unexpected names
4. open a recent period drilldown and confirm requests and token types
5. export a fresh usage backup before making large changes

The normalized dataset is also available through [`GET /api/usage`](/ttdash/reference/http-api/#get-apiusage).
