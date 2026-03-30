# Changelog

## [3.0.0] - 2026-03-31

### Added
- **Date Range Filter** with preset buttons (7T, 30T, Monat, Jahr, Alle)
- **Token-Analyse Redesign** — two separate charts for Cache and I/O tokens with independent Y-axes, solving the scale problem where Cache Read (4.5B) made Input/Output (3.2M) invisible
- **Per-Type 7-Tage Durchschnitt** for all four token types (Cache Read, Cache Write, Input, Output)
- **Total Tokens Chart** in zoom mode showing combined tokens with 7-day moving average
- **Per-Model 7-Tage Durchschnitt** in zoom mode for Kosten nach Modell
- **Zoom Stats Bar** showing Min, Max, Durchschnitt, Total, Datenpunkte for all charts
- **CSV Export** button in zoom mode for all charts
- **ExpandableCard stats** for Heatmap, Cache ROI, Periodenvergleich, Anomalie-Erkennung
- **Token Drill-Down** — click on token chart data points to open detail modal
- **Kostenprognose Trend** — week-over-week comparison and daily average in forecast card
- **Empty States** for Periodenvergleich and Anomalie-Erkennung with informative messages
- **Skeleton Loading** components replacing the plain "Laden..." text
- **Section Headers** with badges and descriptions for all dashboard sections
- **Help Panel** with keyboard shortcuts, metric explanations, and chart descriptions
- **Info Tooltips** (i) on all metric cards and chart headers
- **FormattedValue Tooltips** — hover over abbreviated numbers ($1.2k, 4.8B) to see exact values
- **Glassmorphism Theme** with backdrop-blur, gradient borders, and card shadows
- **Light Mode** fully polished alongside dark mode

### Fixed
- **PDF Export** — resolved html2canvas crash with Tailwind CSS v4 `oklab()` colors via canvas-based RGB conversion
- **Model Filter** — now correctly filters costs within each day (previously showed all models' costs if any matched)
- **MA7 Line invisible** — switched from `AreaChart` to `ComposedChart` so `<Line>` components render correctly alongside `<Area>`
- **Forecast Chart black** — removed opaque lower confidence band that masked data lines
- **Forecast in monthly/yearly view** — shows average cost summary instead of broken daily forecast
- **Forecast bridge point** — forecast line now connects from last actual data point
- **CostByModelOverTime misleading** — changed from stacked areas to individual lines per model
- **Tooltip clipping** — removed `overflow-hidden` from Card component
- **Tooltip delay** — reduced from 700ms to 100ms for responsive feel
- **Info labels** — ChartCard now uses InfoButton (Radix Tooltip) instead of native HTML title
- **CostByWeekday white hover** — replaced default cursor with themed overlay
- **Periodenvergleich timezone bug** — fixed UTC date shift in week calculations
- **Periodenvergleich data source** — uses full dataset (model-filtered only) instead of date-filtered data
- **Wochenstart Montag** — week comparison now starts on Monday (Swiss/European standard)
- **Cache-Rate Delta color** — higher cache rate now correctly shown in green (positive)
- **ViewMode bug** — day/month/year view selector now actually aggregates data
- **Gradient ID conflicts** — unique IDs via `useId()` prevent SVG conflicts in zoom mode

### Changed
- **Forecast colors** — Prognose line is teal (distinct from blue Ist-Kosten), Konfidenzband is transparent teal
- **CostByModelOverTime title** — removed misleading "7-Tage Ø" since chart shows individual model lines
- **Token chart layout** — split into Cache Tokens (top) + I/O Tokens (bottom) with summary tiles
- **CacheROI** — added FormattedValue, InfoButton, Ø Tageskosten metric, 4-column grid
- **Button/Badge transitions** — smooth `transition-all duration-200` on all interactive elements
- **FilterBar model pills** — added hover scale effect

## [2.0.0] - 2026-03-30

### Added
- Complete frontend rebuild with Vite + React + TypeScript + Tailwind CSS v4
- Interactive charts with Recharts (cost over time, model breakdown, tokens, heatmap, etc.)
- Command Palette (Cmd+K) for keyboard navigation
- PDF report export
- CSV data export
- Dark/Light theme toggle
- Framer Motion animations (FadeIn, CountUp)
- Drill-down modal for daily detail view
- Cost forecast with linear regression
- Cache ROI analysis
- Period comparison (week/month)
- Anomaly detection (2σ threshold)
- Heatmap calendar view

## [1.0.0] - Initial Release

### Added
- Node.js HTTP server with static file serving
- JSON data upload/download API
- Basic dashboard functionality
