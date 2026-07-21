# HTTP API Reference

TTDash exposes a same-origin JSON/SSE API under `/api`. It is primarily used by the bundled dashboard, but authenticated clients can use it for local automation. This is a compact operational reference, not a promise that every response field will remain unchanged across major releases.

## Authentication

All `/api` routes require authentication except `POST /api/auth/session`, which performs its own remote-token validation.

### Local loopback mode

TTDash generates a random token for every start. The browser bootstrap URL exchanges it for an HttpOnly, SameSite cookie. With `--no-open`, copy the `Local Auth URL` printed in the startup summary. A scripted local client can extract that URL's `ttdash_token` query value and send it as a bearer token while that process is running.

### Remote and Docker mode

Send the configured master token with either header:

```http
Authorization: Bearer <TTDASH_REMOTE_TOKEN>
```

```http
X-TTDash-Remote-Token: <TTDASH_REMOTE_TOKEN>
```

For browsers, `POST /api/auth/session` exchanges the master token for a random HttpOnly, SameSite session cookie. The session lasts up to 12 hours, is held only in server memory, and can expire earlier after restart or bounded-session eviction. With `TTDASH_SECURE_COOKIE=1`, the cookie is sent only over HTTPS.

Unauthorized API responses return `401`, `WWW-Authenticate`, and `X-TTDash-Auth-Mode: local|remote`. Remote login attempts are rate-limited per client; a limited response is `429` with `Retry-After`.

## Request Rules

- The `Host` header must pass the runtime trusted-host policy.
- State-changing browser routes and remote session creation must be same-origin: `Origin` must agree with `Host`, and cross-site `Sec-Fetch-Site` requests are rejected.
- Usage and settings routes that accept JSON require `Content-Type: application/json`.
- General request bodies are limited to 10 MiB.
- Errors use JSON such as `{ "message": "..." }` unless the successful response is a PDF or SSE stream.
- `X-Forwarded-Host` is not trusted.

## Endpoints

| Method   | Path                           | Purpose                                              | Successful response                    |
| -------- | ------------------------------ | ---------------------------------------------------- | -------------------------------------- |
| `POST`   | `/api/auth/session`            | Exchange a remote master token for a browser session | `204` plus `Set-Cookie`                |
| `GET`    | `/api/usage`                   | Read normalized usage data                           | Usage object with `daily` and `totals` |
| `DELETE` | `/api/usage`                   | Delete persisted usage data                          | `{ "success": true }`                  |
| `POST`   | `/api/upload`                  | Normalize and replace the complete dataset           | Imported day count and total cost      |
| `POST`   | `/api/usage/import`            | Conservatively merge a usage backup by date          | Added/skipped/conflicting summary      |
| `GET`    | `/api/settings`                | Read normalized settings and runtime load status     | Settings object                        |
| `PATCH`  | `/api/settings`                | Apply a partial settings update                      | Normalized settings object             |
| `DELETE` | `/api/settings`                | Delete persisted settings and return defaults        | Success flag and normalized settings   |
| `POST`   | `/api/settings/import`         | Validate and replace settings from a backup          | Normalized settings object             |
| `POST`   | `/api/auto-import/stream`      | Run the singleton toktrack import                    | Server-Sent Events stream              |
| `GET`    | `/api/runtime`                 | Read process/runtime identity and port metadata      | Runtime snapshot                       |
| `GET`    | `/api/toktrack/version-status` | Compare pinned and latest toktrack versions          | Version-status object                  |
| `POST`   | `/api/report/pdf`              | Generate a PDF for a dashboard selection             | `application/pdf` download             |

Unsupported methods return `405`; unknown API routes return `404`.

## Examples

Read usage:

```bash
curl \
  -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  http://127.0.0.1:3000/api/usage
```

Replace usage with a JSON file:

```bash
curl \
  --request POST \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary @examples/sample-usage.json \
  http://127.0.0.1:3000/api/upload
```

Update selected settings:

```bash
curl \
  --request PATCH \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"language":"en","theme":"dark"}' \
  http://127.0.0.1:3000/api/settings
```

Start auto-import and receive SSE frames:

```bash
curl --no-buffer \
  --request POST \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  http://127.0.0.1:3000/api/auto-import/stream
```

The stream emits `check`, `progress`, `stderr`, `success`, `error`, and `done` events. A concurrent import returns `409` instead of starting another process.

## Settings Patch Fields

`PATCH /api/settings` accepts these optional top-level fields:

- `language`: `de` or `en`
- `theme`: `dark` or `light`
- `reducedMotionPreference`: `system`, `always`, or `never`
- `providerLimits`: provider-keyed subscription and monthly-limit configuration
- `defaultFilters`: view mode, date preset, providers, and models
- `sectionVisibility`: visibility keyed by dashboard section ID
- `sectionOrder`: ordered dashboard section IDs

Unknown or malformed values are normalized through the shared settings contract rather than persisted verbatim.

## PDF Request

`POST /api/report/pdf` accepts the current dashboard selection:

```json
{
  "viewMode": "daily",
  "selectedMonth": null,
  "selectedProviders": [],
  "selectedModels": [],
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "language": "en"
}
```

The server generates the report from persisted usage data. It returns `400` when no data is available and `503` when Typst is missing.

For deployment requirements, read the [configuration](configuration.md), [Docker](docker.md), and [security](../SECURITY.md) documentation.
