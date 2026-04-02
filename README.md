# TTDash

Local usage dashboard for `toktrack` data. `TTDash` runs entirely on your machine and turns raw usage exports into charts, KPIs, forecasts, provider/model breakdowns, and drill-down views.

![TTDash dashboard screenshot](docs/ttdash-dashboard.png)

## Why TTDash

- Local-first: data stays on your device
- Fast setup: install once, run with `ttdash`
- Works with `toktrack` and legacy `ccusage` JSON
- Auto-import from local `toktrack` without manual export
- Built for day-to-day cost and token analysis, not just static reports

## Features

- Provider and model filtering for OpenAI, Anthropic, Google, and more
- KPI sections for overall usage, today, and current month
- Cost charts, cumulative projection, forecast, token mix, model mix, heatmap, and weekday analysis
- Drill-down modal for per-day details
- CSV export and PDF report export
- Command palette, keyboard shortcuts, and responsive layout
- Animated chart reveals on scroll and on dashboard reload

## Installation

### Recommended

macOS / Linux:

```bash
sh install.sh
ttdash
```

Windows:

```bat
install.bat
ttdash
```

The installer prefers Bun when available and falls back to npm where needed. The app opens in your browser automatically on local start.

### Manual install

```bash
npm install
npm run build
npm install -g .
ttdash
```

Or with Bun:

```bash
bun install
bun run build
bun add -g file:$(pwd)
ttdash
```

## Usage

Start the app:

```bash
ttdash
```

Then either:

1. Click `Auto-Import` to load local `toktrack` data
2. Upload a `toktrack` JSON file manually
3. Upload a legacy `ccusage` export

The auto-import path prefers:

1. local `toktrack`
2. `bunx toktrack`
3. `npx --yes toktrack`

The server automatically picks the next free port if `3000` is occupied.

## Development

```bash
npm install
npm run dev
node server.js
```

- Vite dev server: `http://localhost:5173`
- API / production server: `http://localhost:3000`

Build a production bundle:

```bash
npm run build
```

## Project Structure

```text
src/
  components/
    cards/        metric sections
    charts/       Recharts visualizations and chart containers
    features/     auto-import, forecast, heatmap, drill-down, PDF, help
    layout/       header and filter controls
    tables/       model and recent-day breakdowns
    ui/           shared UI primitives
  hooks/          data, filter, and metric hooks
  lib/            calculations, formatters, API helpers, model/provider utils
  types/          shared TypeScript types
server.js         local HTTP server and auto-import endpoint
usage-normalizer.js
install.sh
install.bat
dist/             production build output
docs/             README assets
```

## Data & Privacy

- No cloud backend
- No remote database
- Imported data is stored locally in `data.json`
- Auto-import reads local `toktrack` output and normalizes it for the dashboard

## Troubleshooting

### `ttdash` not found after install

Make sure your global package manager bin directory is in `PATH`.

For Bun:

```bash
echo $PATH
ls -la ~/.bun/bin/ttdash
```

### Port already in use

`TTDash` automatically retries on the next port. You can also force one:

```bash
PORT=3010 ttdash
```

### Auto-import cannot find `toktrack`

Install `toktrack` locally or ensure `bunx` / `npx` can execute it.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS v4
- Recharts 3
- Radix UI
- Framer Motion
- Node.js HTTP server

## Status

There is currently no dedicated automated test suite in the repository. Validation is done via production builds and Playwright-based browser checks.

## License

MIT
