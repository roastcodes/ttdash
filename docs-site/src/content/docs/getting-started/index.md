---
title: Install and run TTDash
description: Requirements, installation options, first launch, and the first successful data import.
---

TTDash is a local-first dashboard and CLI for [`toktrack`](https://github.com/mag123c/toktrack) usage data. The fastest path is to run the latest published package directly.

## Requirements

- Node.js 20 or newer for npm and npx installations
- a modern browser
- npm or Bun when auto-import needs a package-runner fallback
- [Typst](https://typst.app/) only when you want PDF export
- Docker with Compose v2 only for container deployments

## Run without a global install

Use either package runner:

```bash title="npm / npx"
npx --yes @roastcodes/ttdash@latest
```

```bash title="Bun"
bunx @roastcodes/ttdash@latest
```

TTDash starts on `http://127.0.0.1:3000`. If that port is occupied, it tries the requested port and up to 100 following ports, then prints the selected URL.

:::tip
Use the package name with `@latest` when running through npx or bunx. That makes the version you intend to run explicit.
:::

## Install globally

Install the `ttdash` command when you use it regularly:

```bash title="npm"
npm install --global @roastcodes/ttdash
ttdash
```

```bash title="Bun"
bun add --global @roastcodes/ttdash
ttdash
```

Confirm the executable without starting the server:

```bash
ttdash --help
```

## First launch

1. Start TTDash.
2. Let it open the generated local authentication URL, or copy the **Local Auth URL** from the terminal when browser opening is disabled.
3. Select **Auto import** to run the TTDash-pinned toktrack version, or choose **Upload** and select compatible JSON.
4. Use the filter bar to choose a period, provider, model, and daily/monthly/yearly aggregation.
5. Open **Settings** to save default filters, section order, theme, language, and motion preferences.

The local server generates a fresh bootstrap token for each start, exchanges it for an HttpOnly browser cookie, and removes it from the address. You do not need to configure a password for ordinary loopback use.

## Common starts

```bash
# Choose the first port to try.
ttdash --port 3010

# Do not open a browser.
ttdash --no-open

# Import toktrack data once during startup.
ttdash --auto-load

# Run as a managed background instance.
ttdash --background

# Stop a managed background instance.
ttdash stop
```

Flags can be combined:

```bash
ttdash --background --port 3010 --auto-load
```

See [Configuration and CLI](/ttdash/deploying/configuration/) for every supported option, environment variable, and storage location.

## Keep enough source history

toktrack can only report usage that still exists in the underlying tools' local history. For example, Claude Code removes older sessions after its configured retention period. If you need a longer history, set an appropriate `cleanupPeriodDays` in `~/.claude/settings.json` before old sessions are removed:

```json
{
  "cleanupPeriodDays": 365
}
```

Choose a retention value that matches your own storage and privacy requirements.

## Next steps

- [Import data](/ttdash/getting-started/importing-data/) and understand replacement versus merge behavior.
- Learn the [dashboard and filter workflow](/ttdash/guides/dashboard/).
- Configure [remote access](/ttdash/deploying/remote-access/) only when loopback access is not enough.
