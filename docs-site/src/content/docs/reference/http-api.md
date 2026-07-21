---
title: HTTP API
description: Authenticate API clients and use TTDash JSON, PDF, and Server-Sent Events endpoints.
---

TTDash exposes a same-origin API below `/api`. It primarily serves the bundled dashboard, but authenticated clients can use it for local automation. Response fields can evolve across major releases.

## Authentication

Every API route requires authentication except `POST /api/auth/session`, which performs its own remote-token validation.

### Local mode

The startup summary's local authentication URL contains a per-process `ttdash_token`. A browser exchanges it for an HttpOnly cookie. A scripted local client can extract the query value and send it as a bearer token while that process is running.

### Remote and Docker modes

Send the configured master token with either header:

```http
Authorization: Bearer <TTDASH_REMOTE_TOKEN>
```

```http
X-TTDash-Remote-Token: <TTDASH_REMOTE_TOKEN>
```

Browser sign-in uses `POST /api/auth/session` to exchange the master token for an in-memory session represented by an HttpOnly cookie.

Unauthorized responses include status `401`, `WWW-Authenticate`, and `X-TTDash-Auth-Mode: local|remote`. Remote session attempts are rate-limited; `429` includes `Retry-After`.

## Request and error rules

- every request's `Host` must satisfy the trusted-host policy
- state-changing usage/settings/import routes and session creation require a trusted `Origin` matching `Host` for every client, including scripts
- JSON usage and settings mutations require `Content-Type: application/json`
- request bodies are limited to 10 MiB
- errors are JSON objects such as `{ "message": "..." }`
- unsupported methods return `405`; unknown API routes return `404`
- `X-Forwarded-Host` is not trusted

## Endpoint summary

| Method   | Path                           | Successful response                                   |
| -------- | ------------------------------ | ----------------------------------------------------- |
| `POST`   | `/api/auth/session`            | `204` and a browser session cookie                    |
| `GET`    | `/api/usage`                   | Normalized usage object                               |
| `DELETE` | `/api/usage`                   | `{ "success": true }`                                 |
| `POST`   | `/api/upload`                  | Imported day count and total cost                     |
| `POST`   | `/api/usage/import`            | Added, unchanged, conflict, skipped, and total counts |
| `GET`    | `/api/settings`                | Normalized settings and runtime load status           |
| `PATCH`  | `/api/settings`                | Updated normalized settings                           |
| `DELETE` | `/api/settings`                | Success flag and normalized defaults                  |
| `POST`   | `/api/settings/import`         | Imported normalized settings                          |
| `POST`   | `/api/auto-import/stream`      | Server-Sent Events stream                             |
| `GET`    | `/api/runtime`                 | Process runtime identity and listening metadata       |
| `GET`    | `/api/toktrack/version-status` | Pinned/latest toktrack version status                 |
| `POST`   | `/api/report/pdf`              | PDF download                                          |

## Usage

### `GET /api/usage`

Returns the [normalized usage object](/ttdash/reference/data-formats/#normalized-usage-object). With no stored data, `daily` is empty and every total is zero. Unreadable persisted data returns `500` with a diagnostic message.

```bash
curl \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  http://127.0.0.1:3000/api/usage
```

### `POST /api/upload`

Normalizes and replaces the complete stored dataset. Send one of the [accepted input formats](/ttdash/reference/data-formats/#accepted-input-envelopes).

```bash
curl \
  --request POST \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  --header "Origin: http://127.0.0.1:3000" \
  --header "Content-Type: application/json" \
  --data-binary @usage.json \
  http://127.0.0.1:3000/api/upload
```

Success:

```json
{ "days": 31, "totalCost": 42.75 }
```

Invalid JSON or an unsupported shape returns `400`; a body above 10 MiB returns `413`.

### `POST /api/usage/import`

Conservatively merges a usage backup by valid calendar date. Existing conflicting days stay unchanged.

```json
{
  "importedDays": 12,
  "addedDays": 8,
  "unchangedDays": 2,
  "conflictingDays": 1,
  "conflictingDates": ["2026-07-20"],
  "skippedDays": 1,
  "totalDays": 90
}
```

### `DELETE /api/usage`

Deletes `data.json` and clears usage load metadata. This is destructive and cannot be undone without a backup.

## Settings

### `GET /api/settings`

Returns normalized persisted preferences plus the runtime-only `cliAutoLoadActive` flag. When no settings file exists, it returns normalized defaults.

### `PATCH /api/settings`

Accepts any subset of these fields:

- `language`: `de` or `en`
- `theme`: `dark` or `light`
- `reducedMotionPreference`: `system`, `always`, or `never`
- `providerLimits`: provider-keyed subscription price and monthly limit objects
- `defaultFilters`: view mode, date preset, providers, and models
- `sectionVisibility`: booleans keyed by dashboard section ID
- `sectionOrder`: ordered dashboard section IDs

```bash
curl \
  --request PATCH \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  --header "Origin: http://127.0.0.1:3000" \
  --header "Content-Type: application/json" \
  --data '{"language":"en","theme":"dark"}' \
  http://127.0.0.1:3000/api/settings
```

Unknown or malformed values are normalized through the shared settings contract rather than persisted verbatim.

### `POST /api/settings/import`

Requires a [`ttdash-settings-backup` envelope](/ttdash/reference/data-formats/#settings-backup-envelope), validates its settings payload, replaces persisted settings, and returns the normalized result.

### `DELETE /api/settings`

Deletes `settings.json`, then returns:

```json
{
  "success": true,
  "settings": {}
}
```

The real `settings` value contains the full normalized defaults; the abbreviated example is not a schema definition.

## Auto-import stream

### `POST /api/auto-import/stream`

Starts the singleton toktrack import and returns `text/event-stream` with these named events:

| Event      | Payload                                    |
| ---------- | ------------------------------------------ |
| `check`    | Runner discovery/status object             |
| `progress` | Structured message key and variables       |
| `stderr`   | `{ "line": "..." }`                        |
| `success`  | `{ "days": number, "totalCost": number }`  |
| `error`    | Structured error message key and variables |
| `done`     | Empty object; final event                  |

```bash
curl --no-buffer \
  --request POST \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  --header "Origin: http://127.0.0.1:3000" \
  http://127.0.0.1:3000/api/auto-import/stream
```

Example frame:

```text
event: progress
data: {"key":"loadingUsageData","vars":{"command":"toktrack daily --json"}}
```

A concurrent import returns `409` instead of starting another process. Closing the request aborts the running import.

## Runtime and version status

### `GET /api/runtime`

Returns the composed process runtime snapshot:

```json
{
  "id": "runtime-id",
  "mode": "foreground",
  "port": 3000,
  "url": "http://127.0.0.1:3000"
}
```

### `GET /api/toktrack/version-status`

Checks the npm registry through a bounded, cached lookup:

```json
{
  "configuredVersion": "<pinned-toktrack-version>",
  "latestVersion": "<latest-toktrack-version>",
  "isLatest": true,
  "lookupStatus": "ok"
}
```

On lookup failure, the successful payload can instead contain `latestVersion: null`, `isLatest: null`, a status such as `timeout` or `failed`, and a `message`.

## PDF report

### `POST /api/report/pdf`

Sends the selected dashboard state; the server reads persisted usage and returns an `application/pdf` attachment.

```json
{
  "viewMode": "daily",
  "selectedMonth": null,
  "selectedProviders": [],
  "selectedModels": [],
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "language": "en"
}
```

It returns `400` when no usage data is available, `503` when Typst is missing, and `500` for other rendering failures.

For safe network exposure, read [Remote access and security](/ttdash/deploying/remote-access/).
