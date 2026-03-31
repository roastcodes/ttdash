# ccusage-dashboard

Local dashboard for visualizing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) usage data — token consumption, costs, and model breakdowns.

Built-in data import via [ccusage](https://github.com/ryoppippi/ccusage). Runs with Node.js or Bun.

## Quick Start

```bash
git clone <repo-url>
cd ccusage-dashboard
./install.sh          # macOS/Linux
install.bat           # Windows
ccusage-dashboard
```

Then open the URL shown in the terminal (default: `http://localhost:3000`).

## Features

- **Auto-Import** — one-click data import from Claude Code usage logs, no manual file export needed
- **Today KPIs** — current-day cost, tokens, models, $/1M efficiency, cache rate, I/O ratio with trend vs. average
- **Month KPIs** — current-month cost (with trend vs. previous month), tokens, active days/coverage, models, $/1M efficiency, cache rate
- **12 KPI Metric Cards** — total cost, tokens, active days, top model, cache hit rate, $/1M tokens, most/least expensive day, avg cost/day, median/day — all with hover tooltips for exact values
- **Active Streak** — consecutive active days shown as 🔥 badge in header
- **Interactive Charts** — cost over time, model breakdown, cumulative cost (with end-of-month projection), weekday analysis (peak/low highlighting), token analysis
- **Token-Effizienz** — $/1M tokens over time with 7-day moving average, shows cost optimization trends
- **Modell-Mix** — stacked percentage area chart showing model usage proportions over time with gradient fills
- **Token-Analyse** — split view for Cache and I/O tokens with independent scales, per-type 7-day averages, and percentage breakdowns
- **Cost Forecast** — linear regression with confidence band, color-coded confidence badge (high/medium/low), gradient fill, and week-over-week trend
- **Cache ROI** — savings analysis with "paid" vs "saved" visualization and cost comparison bars
- **Heatmap Calendar** — GitHub-style daily cost visualization with 7-level color scale and today marker
- **Period Comparison** — week/month comparison with colored delta badges (Monday-based weeks)
- **Anomaly Detection** — flags days with costs > 2σ, severity levels with "KRITISCH" badge for ≥3σ
- **Drill-Down Modal** — click any data point for daily detail with token type stacked bar, model share percentages, and pie chart
- **Model Efficiency Table** — sortable columns including $/1M, cost share with model-colored bars, avg cost per active day
- **Recent Days Table** — sortable by date/cost/tokens/$/1M with cost intensity bars and left border intensity
- **Zoom Mode** — expand any chart to fullscreen with stats (min/max/avg/total) and CSV export
- **Date Range Filter** — preset buttons (7T, 30T, Monat, Jahr) with active state highlighting
- **Model Filter** — toggle individual models with accurate per-model cost recalculation
- **View Modes** — daily, monthly, yearly data aggregation
- **Command Palette** (⌘K) — keyboard navigation for all actions
- **Help Panel** — keyboard shortcuts and metric explanations
- **PDF Export** — full dashboard screenshot as multi-page A4 PDF
- **CSV Export** — filtered data download
- **Dark/Light Mode** — glassmorphism design with full theme support
- **Responsive Design** — works on desktop, tablet, and mobile

## Installation

### Global (recommended)

```bash
./install.sh         # macOS/Linux
install.bat          # Windows (run as Administrator)
ccusage-dashboard    # start from anywhere
```

Or manually:

```bash
npm install          # install dependencies
npm run build        # build the frontend into dist/
npm install -g .     # install globally
```

### Without installing globally

```bash
npm install
npm run build
node server.js
```

## Development

The frontend is built with Vite + React + TypeScript + Tailwind CSS v4. Source code lives in `src/`, the production build goes to `dist/`.

```bash
npm install          # install dependencies (first time only)
npm run dev          # start Vite dev server (port 5173) with hot reload
```

Run the API server in a separate terminal for data access:

```bash
node server.js       # API server on port 3000
```

Vite proxies `/api` requests to the API server automatically.

### Build

```bash
npm run build        # compile TypeScript + bundle with Vite into dist/
npm run preview      # preview the production build locally
```

### Project Structure

```
src/
  main.tsx              # entry point
  App.tsx               # provider stack (React Query, Tooltip, Toast)
  index.css             # Tailwind v4 + theme variables + glassmorphism
  types/                # TypeScript interfaces
  lib/                  # utilities (formatters, calculations, api, csv, help-content)
  hooks/                # React hooks (data fetching, filters, metrics, theme)
  components/
    ui/                 # base components (Button, Card, Dialog, Tooltip, FormattedValue, Skeleton, etc.)
    layout/             # Header, FilterBar
    cards/              # MetricCard, PrimaryMetrics, SecondaryMetrics, TodayMetrics, MonthMetrics
    charts/             # Recharts visualizations (ChartCard, CostOverTime, TokensOverTime, TokenEfficiency, ModelMix, etc.)
    tables/             # ModelEfficiency, RecentDays
    features/           # auto-import, heatmap, forecast, cache-roi, comparison, anomaly, drill-down, help, pdf, command-palette
dist/                   # production build output (generated by npm run build)
server.js               # Node.js HTTP server (serves dist/ + API + auto-import)
install.sh              # one-command setup script (macOS/Linux)
install.bat             # one-command setup script (Windows)
```

## Usage

1. Start the dashboard
2. Click **Auto-Import** to load data directly from your Claude Code usage logs
3. Explore your usage data — costs, tokens, model breakdowns

You can also upload a JSON file manually via the Upload button.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Command Palette |
| ESC | Close Dialog / Zoom |

### Custom port

```bash
PORT=8080 ccusage-dashboard
```

The server automatically finds a free port if the default (3000) is already in use.

## Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8 (Rolldown), Tailwind CSS v4
- **Charts**: Recharts 3
- **UI**: Radix UI primitives, Lucide React 1.x, Framer Motion
- **State**: TanStack React Query, React hooks
- **PDF**: html2canvas + jsPDF 4
- **Data**: ccusage (programmatic API for Claude Code usage logs)
- **Server**: Node.js HTTP

## Uninstall

```bash
npm uninstall -g ccusage-dashboard
```
