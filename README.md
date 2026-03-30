# ccusage-dashboard

Local dashboard for visualizing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) usage data — token consumption, costs, and model breakdowns.

Zero external dependencies. Runs with Node.js or Bun.

## Quick Start

```bash
npx ccusage-dashboard
```

Or with Bun:

```bash
bunx ccusage-dashboard
```

Then open the URL shown in the terminal (default: `http://localhost:3000`).

## Installation

### Global (recommended)

```bash
npm install -g ccusage-dashboard
```

Then start from anywhere:

```bash
ccusage-dashboard
```

### From source

```bash
git clone <repo-url>
cd ccusage-dashboard
npm start
```

Or directly:

```bash
node server.js
```

```bash
bun server.js
```

## Usage

1. Start the dashboard
2. Upload your `ccusage.json` file via the UI
3. Explore your usage data — costs, tokens, model breakdowns

### Custom port

```bash
PORT=8080 ccusage-dashboard
```

The server automatically finds a free port if the default (3000) is already in use.

## Uninstall

```bash
npm uninstall -g ccusage-dashboard
```
