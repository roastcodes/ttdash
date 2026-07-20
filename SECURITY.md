# Security Policy

## Supported Versions

Security fixes are applied to the latest release on `main`.

If you are reporting a vulnerability, please reproduce it against the current release or current `main` before reporting when possible.

## Reporting a Vulnerability

Please use GitHub private vulnerability reporting if it is enabled for the public repository.

If private reporting is not available:

- do not open a public issue with exploit details
- open a minimal issue requesting a private contact path, or contact the maintainer through GitHub first

Please include:

- a clear description of the issue
- affected versions or commit range if known
- reproduction steps or proof of concept
- impact assessment
- any suggested mitigation if you already have one

## Response Expectations

This project is maintained on a best-effort basis by a single maintainer. Reports will be reviewed as quickly as practical, but no fixed response SLA is promised.

## Deployment Notes

`TTDash` is intended to run as a local-first app on loopback by default. Binding it to a non-loopback host exposes local API routes for uploads, imports, resets, and report generation to your network.

Non-loopback binding therefore requires an explicit opt-in and a remote token with at least 24
characters. Only use remote token access over a trusted LAN, VPN, or SSH tunnel; for any public
hostname, put TTDash behind an HTTPS reverse proxy with valid TLS termination before sending the
bearer token.

```bash
TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=0.0.0.0 ttdash
curl -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" http://127.0.0.1:3000/api/usage
```

When calling the server from another device, replace `127.0.0.1` with the server's LAN, VPN, or
SSH-tunneled host. For public hostnames, call an HTTPS reverse proxy URL instead; do not send the
bearer token over public HTTP.

Remote API requests can authenticate with `Authorization: Bearer $TTDASH_REMOTE_TOKEN` or the
equivalent `X-TTDash-Remote-Token` header. Keep the token secret.

### Docker mode

`ttdash --docker` (or `TTDASH_DOCKER=1`) is an explicit remote-bind opt-in. It defaults to
`HOST=0.0.0.0`, disables browser auto-open, and still refuses to start without a remote token of at
least 24 characters. Docker mode trusts the exact browser hosts `localhost`, `127.0.0.1`, and `::1`
in addition to the active socket address. Add server IP addresses or DNS names explicitly with a
comma-separated `TTDASH_TRUSTED_HOSTS` value. Schemes, ports, paths, and wildcards are rejected.

Remote browser sign-in exchanges the master token for a random, expiring HttpOnly/SameSite session.
Set `TTDASH_SECURE_COOKIE=1` behind an HTTPS reverse proxy so those sessions receive a `Secure`
cookie without trusting client-controlled proxy headers. The master token is not accepted as a
remote query parameter and is not stored in browser storage. API clients should continue to use a
token header.

The provided Compose configuration binds only to host loopback by default. When publishing on a
server interface, keep the existing trusted-LAN/VPN/SSH-tunnel restriction or terminate valid HTTPS
at a reverse proxy. Preserve the original `Host`; TTDash intentionally ignores forwarded-host
headers and continues to require same-host browser origins for mutations.
