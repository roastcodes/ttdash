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

## Normalized usage object

The stored object and `GET /api/usage` response have this shape:

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

## Normalization behavior

- numeric values and numeric strings are converted to numbers; missing or unusable values become `0`
- a missing `totalTokens` value is calculated from input, output, cache-creation, cache-read, and thinking tokens
- dates that normalize to an empty string are discarded
- accepted rows are sorted lexicographically by date
- `modelsUsed` keeps string entries only
- a legacy row can derive `modelsUsed` from `modelBreakdowns`
- top-level totals are always recalculated

:::caution
Replacement upload does not merge duplicate dates. Produce one row per calendar date. Backup import validates real `YYYY-MM-DD` dates and merges conservatively by date.
:::

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
