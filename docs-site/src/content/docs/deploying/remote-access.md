---
title: Remote access and security
description: Bind TTDash beyond loopback without weakening authentication, host validation, or transport security.
---

TTDash is safest on its default loopback interface. Enable remote access only for a specific network topology you control.

## Authentication modes

### Local loopback

Every start generates a random local token. TTDash places it in a one-time bootstrap URL, exchanges it for an HttpOnly, SameSite cookie, then redirects to an address without the token. With `--no-open`, copy the **Local Auth URL** from the startup summary.

### Remote or Docker

A non-loopback bind requires both explicit permission and a master token containing at least 24 characters:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash --no-open
```

The browser sign-in sends the token to `POST /api/auth/session` and receives a random HttpOnly, SameSite session cookie. Sessions live in server memory for up to 12 hours and can expire earlier after restart or bounded-session eviction.

API clients send the master token on every request:

```bash
curl \
  --header "Authorization: Bearer $TTDASH_REMOTE_TOKEN" \
  http://192.0.2.10:3000/api/usage
```

The `X-TTDash-Remote-Token` header is also supported. Never put the remote master token in a URL.

## Trusted hosts

Browser requests must use a `Host` accepted by the runtime policy. For an explicit LAN name or IP:

```bash
TTDASH_TRUSTED_HOSTS=dashboard.internal,192.0.2.10
```

Entries must be exact DNS names or IP addresses. Schemes, ports, paths, empty labels, and wildcards are rejected. An explicit value replaces Docker's default `localhost`, `127.0.0.1`, and `::1` entries.

Host validation does not change the listening interface, container port publishing, firewall, or routing. TTDash intentionally does not trust `X-Forwarded-Host`.

## Request protections

- all API routes require authentication except the session exchange, which validates the master token itself
- state-changing usage/settings/import requests and session creation require `Origin` to agree with `Host`, including for scripted clients
- cross-site `Sec-Fetch-Site` requests are rejected
- JSON mutation endpoints require `Content-Type: application/json`
- request bodies are limited to 10 MiB
- remote login attempts are rate-limited per client
- browser responses include a restrictive Content Security Policy and standard security headers

## Public HTTPS through a reverse proxy

Do not expose TTDash over public plaintext HTTP. Keep the service private behind an HTTPS reverse proxy:

```bash
export TTDASH_REMOTE_TOKEN="$(openssl rand -hex 32)"
export TTDASH_TRUSTED_HOSTS=dashboard.example
export TTDASH_SECURE_COOKIE=1
export TTDASH_TRUST_PROXY=1
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash --no-open
```

The proxy must:

- be the process's only ingress
- terminate valid HTTPS
- preserve the original `Host: dashboard.example` header
- overwrite the forwarded client chain so the actual client address is the last `X-Forwarded-For` entry
- never rely on `X-Forwarded-Host`

`TTDASH_SECURE_COOKIE=1` marks browser session cookies as HTTPS-only. `TTDASH_TRUST_PROXY=1` changes only the address used for login rate limits; without a restricted proxy topology, client-controlled forwarded headers can weaken those limits.

The non-loopback bind is what activates remote-token authentication. Restrict that port so only the proxy can reach it, or bind to a dedicated private interface instead of `0.0.0.0`.

:::caution
The environment variable examples above are a topology pattern, not a complete reverse-proxy or firewall configuration. Restrict the TTDash port at the operating-system, container, or cloud-network layer as well.
:::

## Operational checklist

- Generate a long random token; do not commit or bake it into an image.
- Publish only to loopback unless another interface is explicitly required.
- Restrict remote access to a trusted LAN, VPN, SSH tunnel, or authenticated HTTPS proxy.
- List exact browser hostnames/IPs in `TTDASH_TRUSTED_HOSTS`.
- Enable secure cookies only when every client uses HTTPS.
- Enable proxy trust only when the trusted proxy is the sole ingress and overwrites forwarding headers.
- Store usage backups as sensitive operational data.
- Review the current [security policy](https://github.com/roastcodes/ttdash/security/policy) and [release notes](https://github.com/roastcodes/ttdash/releases) before an internet-facing deployment.

For endpoints and authentication headers, continue with the [HTTP API reference](/ttdash/reference/http-api/).
