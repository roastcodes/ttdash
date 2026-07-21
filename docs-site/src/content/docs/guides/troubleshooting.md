---
title: Troubleshooting
description: Diagnose startup, import, storage, PDF, remote access, and container problems.
---

Start with the terminal summary and the detailed message shown in the dashboard. TTDash reports the selected port, bind host, authentication mode, storage files, and data status at startup.

## The dashboard is empty

- Select **Auto import** and expand the **Toktrack auto import** progress details.
- Upload a supported JSON file from `toktrack daily --json`.
- Select **Reset all**, then choose **All** and clear provider/model filters.
- Confirm that the source tool still retains the dates you expect.

See [Import usage data](/ttdash/getting-started/importing-data/) for accepted workflows.

## Auto-import cannot run

- Ensure npm or Bun is available in the same environment as TTDash.
- If a local toktrack executable is rejected, its version does not match the exact version pinned by this TTDash release.
- Let TTDash use its bunx/npx fallback, or point `TTDASH_TOKTRACK_LOCAL_BIN` to a compatible executable.
- In Docker, verify required source files are mounted and the chosen runner exists inside the image.

## The expected port is busy

TTDash tries the requested port and up to 100 following ports without exceeding `65535`. Read the startup summary or choose another starting port:

```bash
ttdash --port 3010
```

## The `ttdash` command is not found

Use npx without a global install:

```bash
npx --yes @roastcodes/ttdash@latest --help
```

For a global install, verify that npm's or Bun's global binary directory is on `PATH`.

## Stored data or settings are unreadable

The API identifies whether usage or settings persistence is affected. Recover from a known-good backup, or move the named file out of the configured directory before restarting. Do not edit a corrupt file in place without preserving a copy.

Default locations and supported overrides are listed under [Storage locations](/ttdash/deploying/configuration/#storage-locations).

## PDF export fails

Install Typst in the environment running the TTDash server, then confirm:

```bash
typst --version
```

Installing Typst only on the browser machine does not help a remote server. The standard Docker image intentionally omits it.

## Remote login reappears

Remote sessions are kept in server memory for up to 12 hours. A restart, expiry, or bounded-session eviction requires signing in again with the remote master token. This does not indicate that the token was stored by the browser.

## The host is rejected

Set `TTDASH_TRUSTED_HOSTS` to the exact DNS names or IP addresses used by browsers. Do not include a scheme, port, path, empty label, or wildcard.

Host validation does not open a firewall or change the listening address. Review [Remote access and security](/ttdash/deploying/remote-access/) before changing it.

## Still stuck?

Search existing [GitHub issues](https://github.com/roastcodes/ttdash/issues), then open a reproducible report with:

- TTDash, Node.js, and operating-system versions
- the exact start command with secrets removed
- relevant terminal output
- expected and actual behavior
- a minimal sanitized input shape when the issue concerns import

Report security vulnerabilities privately through the [security policy](https://github.com/roastcodes/ttdash/security/policy), not a public issue.
