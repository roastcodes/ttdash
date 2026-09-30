---
title: Data formats
description: Accepted toktrack and legacy input shapes, the normalized usage schema, and TTDash backup envelopes.
---

TTDash normalizes supported uploads and auto-import output into one daily schema. This page documents the public interchange shape; internal derived chart structures are not part of it.

## Accepted input envelopes

TTDash accepts:

- a top-level array of current toktrack daily rows
- an object containing a `daily` array of current toktrack rows
- an object containing a `daily` array of normalized or legacy TTDash rows
- a TTDash usage-backup envelope on the backup-import endpoint

Top-level totals in an uploaded object are not trusted. TTDash recomputes them from normalized daily rows.

## Current toktrack rows

A `toktrack daily --json` result uses snake-case totals and a model-keyed object:

```json
[
  {
    "date": "2026-07-20",
    "total_input_tokens": 182000,
    "total_output_tokens": 38100,
    "total_cache_creation_tokens": 64000,
    "total_cache_read_tokens": 156000,
    "total_thinking_tokens": 1200,
    "total_cost_usd": 4.82,
    "models": {
      "claude-sonnet": {
        "input_tokens": 182000,
        "output_tokens": 38100,
        "cache_creation_tokens": 64000,
        "cache_read_tokens": 156000,
        "thinking_tokens": 1200,
        "cost_usd": 4.82,
        "count": 38
      }
    }
  }
]
```

Model object keys become `modelName`; each model's `count` contributes to the day's `requestCount`.

### Model and provider labels

TTDash keeps the raw model identifier in stored breakdowns and derives a normalized display label and provider at read time. It understands toktrack's `::<provider>` suffixes, including `::github-copilot`, and current GPT numeric, Codex, Chat, Pro, Mini, Nano, Sol, Terra, and Luna variants. Recognized families receive stable chart colors; different GPT variants remain visually distinct. Unknown model IDs are still retained and receive a deterministic fallback color.

## Normalized usage object

The local `data.json` object has this shape. `GET /api/usage` adds source-system metadata as described below.

```json
{
  "daily": [
    {
      "date": "2026-07-20",
      "inputTokens": 182000,
      "outputTokens": 38100,
      "cacheCreationTokens": 64000,
      "cacheReadTokens": 156000,
      "thinkingTokens": 1200,
      "totalTokens": 441300,
      "totalCost": 4.82,
      "requestCount": 38,
      "modelsUsed": ["claude-sonnet"],
      "modelBreakdowns": [
        {
          "modelName": "claude-sonnet",
          "inputTokens": 182000,
          "outputTokens": 38100,
          "cacheCreationTokens": 64000,
          "cacheReadTokens": 156000,
          "thinkingTokens": 1200,
          "cost": 4.82,
          "requestCount": 38
        }
      ]
    }
  ],
  "totals": {
    "inputTokens": 182000,
    "outputTokens": 38100,
    "cacheCreationTokens": 64000,
    "cacheReadTokens": 156000,
    "thinkingTokens": 1200,
    "totalCost": 4.82,
    "totalTokens": 441300,
    "requestCount": 38
  }
}
```

### Daily fields

| Field                 | Type     | Meaning                                                                   |
| --------------------- | -------- | ------------------------------------------------------------------------- |
| `date`                | string   | Calendar date; use `YYYY-MM-DD` for imports and backups                   |
| `inputTokens`         | number   | Uncached input tokens                                                     |
| `outputTokens`        | number   | Output tokens                                                             |
| `cacheCreationTokens` | number   | Tokens written to provider cache                                          |
| `cacheReadTokens`     | number   | Tokens read from provider cache                                           |
| `thinkingTokens`      | number   | Reported thinking/reasoning tokens                                        |
| `totalTokens`         | number   | Total token activity across the token categories                          |
| `totalCost`           | number   | Cost in USD                                                               |
| `requestCount`        | number   | Requests represented by the row                                           |
| `modelsUsed`          | string[] | Model names present in the row                                            |
| `modelBreakdowns`     | object[] | Per-model usage with the same token categories, `cost`, and request count |

All eight numeric total fields also appear below `totals` as sums across `daily`.

## Aggregate usage response

`GET /api/usage` returns `daily` and `totals` aggregated across the local host and every imported system. It also includes the normalized source datasets so the browser can apply the system filter without rewriting persistent files:

```json
{
  "daily": [],
  "totals": {
    "inputTokens": 0,
    "outputTokens": 0,
    "cacheCreationTokens": 0,
    "cacheReadTokens": 0,
    "thinkingTokens": 0,
    "totalCost": 0,
    "totalTokens": 0,
    "requestCount": 0
  },
  "systems": [
    {
      "id": "workstation-a",
      "hostname": "workstation-a",
      "filename": "ttdash-system-workstation-a.json",
      "isLocal": true,
      "exportedAt": null,
      "data": {
        "daily": [],
        "totals": {
          "inputTokens": 0,
          "outputTokens": 0,
          "cacheCreationTokens": 0,
          "cacheReadTokens": 0,
          "thinkingTokens": 0,
          "totalCost": 0,
          "totalTokens": 0,
          "requestCount": 0
        }
      }
    }
  ],
  "unreadableSystemFiles": []
}
```

System IDs are canonical lowercase hostnames. Rows on the same date are combined, and model breakdowns with the same raw `modelName` and request-counter status are summed. The local entry is present only when `data.json` exists.

An unreadable or externally corrupted system file is skipped instead of taking the complete dashboard offline. Its deterministic filename and a safe diagnostic appear in `unreadableSystemFiles`; the Maintenance settings can then delete the complete additional-system collection, and a full reset removes it as well.

## Normalization behavior

- numeric values and numeric strings must be finite and nonnegative; token and request counts must be safe integers
- dates must be real `YYYY-MM-DD` calendar dates
- daily totals cannot be smaller than the sum of model breakdowns (USD tolerance: `0.000001`); a supplied `totalTokens` must match the sum of token categories
- missing daily totals are derived from breakdowns; legitimate daily amounts without model allocation use the reserved `__ttdash_unassigned__` model
- identical duplicate dates are counted once; conflicting duplicates reject the entire new import
- malformed replacement uploads, backup imports, system imports, and auto-import results reject atomically before persistence, with at most 50 date/field/code diagnostics
- persisted legacy files are read without modification; invalid rows and conflicting dates are excluded, and optional `qualityIssues` describe the findings
- backup merges return a conflict with those diagnostics when the existing file contains invalid rows; correct or explicitly replace the file first so a merge cannot discard the original rows
- optional `requestCountStatus` on days and breakdowns is `known`, `partial`, or `unknown`; a missing counter is unknown, while an explicitly reported zero is known
- request-counter metadata survives exports and reimports without changing the version-1 backup envelope; new imports receive fresh diagnostics instead of trusting supplied `qualityIssues`
- top-level totals are always recalculated and checked for overflow

Legacy normalized files lacking counter metadata infer positive counters as known. Data-quality diagnostics do not recover discarded measurements: correct the source or reload it before interpreting incomplete totals as a full budget.

## Usage backup envelope

The dashboard exports usage in a versioned envelope:

```json
{
  "kind": "ttdash-usage-backup",
  "version": 1,
  "exportedAt": "2026-07-21T10:00:00.000Z",
  "appVersion": "<current-ttdash-version>",
  "data": {
    "daily": [],
    "totals": {
      "inputTokens": 0,
      "outputTokens": 0,
      "cacheCreationTokens": 0,
      "cacheReadTokens": 0,
      "thinkingTokens": 0,
      "totalCost": 0,
      "totalTokens": 0,
      "requestCount": 0
    }
  }
}
```

`POST /api/usage/import` accepts this envelope and also retains compatibility with raw supported usage payloads. It rejects a settings-backup envelope as the wrong file type.

## System-transfer envelope

System transfers use a dedicated envelope and deterministic filename, `ttdash-system-<hostname>.json`:

```json
{
  "kind": "ttdash-system-export",
  "version": 1,
  "exportedAt": "2026-08-18T08:00:00.000Z",
  "appVersion": "<current-ttdash-version>",
  "hostname": "workstation-a",
  "data": {
    "daily": [],
    "totals": {
      "inputTokens": 0,
      "outputTokens": 0,
      "cacheCreationTokens": 0,
      "cacheReadTokens": 0,
      "thinkingTokens": 0,
      "totalCost": 0,
      "totalTokens": 0,
      "requestCount": 0
    }
  }
}
```

The hostname is canonicalized to lowercase and may contain ASCII letters, digits, dots, underscores, and hyphens. TTDash ignores the uploaded filename and derives the stored filename from the validated envelope hostname. The `data` value is normalized exactly like local usage before it is stored.

This format is accepted only by the system preview/import endpoints. Ordinary replacement upload and conservative usage-backup import reject it, preventing transferred hosts from being folded into local `data.json`.

## Settings backup envelope

Settings use a separate envelope:

```json
{
  "kind": "ttdash-settings-backup",
  "version": 1,
  "exportedAt": "2026-07-21T10:00:00.000Z",
  "appVersion": "<current-ttdash-version>",
  "settings": {
    "language": "en",
    "theme": "dark",
    "reducedMotionPreference": "system",
    "providerLimits": {},
    "defaultFilters": {
      "viewMode": "daily",
      "datePreset": "all",
      "systems": [],
      "providers": [],
      "models": []
    },
    "sectionVisibility": {},
    "sectionOrder": [],
    "lastLoadedAt": null,
    "lastLoadSource": null
  }
}
```

Settings import requires the exact `ttdash-settings-backup` kind and a settings object. Values are normalized through the shared application settings contract before use.
