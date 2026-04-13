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

Non-loopback binding therefore requires an explicit opt-in:

```bash
TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash
```

Only use that mode on trusted networks.
