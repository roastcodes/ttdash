---
title: Dashboard and filters
description: Navigate metrics, analysis sections, filters, drilldowns, and keyboard controls.
---

The dashboard applies one shared selection to headline metrics, charts, tables, CSV export, and PDF report requests. Start with the filter bar, then move from overview cards into the analyses that explain the result.

## Filter the dataset

The filter bar supports:

- daily, monthly, and yearly aggregation
- all-time, 7-day, 30-day, current-month, and current-year presets
- a specific month
- an inclusive custom start and end date
- one or more providers
- one or more models

Provider and model filters combine with the selected time range. **Reset all** returns to your saved defaults, not necessarily the factory defaults. Configure those defaults in **Settings**.

:::tip
Use daily aggregation to inspect exact activity and calendar heatmaps. Monthly and yearly views are more useful for long-range cost and provider trends.
:::

## Read the analysis flow

TTDash groups analysis into configurable sections:

- insights and headline metrics
- today and current-month summaries
- cost, request, and token activity calendars
- forecasts, cache ROI, and request quality
- provider subscriptions and monthly limits
- cost, token, and request analyses
- distributions, correlations, and concentration risk
- period comparisons and anomaly detection
- provider, model, and recent-period tables

Each metric is derived from the currently selected normalized daily rows. Forecasts are estimates, not billing statements; compare important totals with your provider's official billing data.

## Drill into a period

Cost and request time-series points open a period drilldown. Recent-period table rows can be activated with a pointer, <kbd>Enter</kbd>, or <kbd>Space</kbd>. Inside a drilldown, use left and right arrow keys to move between available periods.

Expanded charts preserve the current selection. Close an expanded view or dialog with <kbd>Escape</kbd>.

## Customize sections

Open **Settings** to:

- show or hide each dashboard section
- reorder the sections
- choose light or dark theme
- switch between German and English
- follow the operating-system motion preference, always reduce motion, or never reduce it
- record provider subscription prices and monthly limits
- save default date, aggregation, provider, and model filters

Settings are stored locally in `settings.json` and can be exported separately from usage data.

## Command palette and keyboard use

Open the command palette with <kbd>Ctrl</kbd>+<kbd>K</kbd> on Windows/Linux or <kbd>Cmd</kbd>+<kbd>K</kbd> on macOS. It exposes dashboard actions, filters, section navigation, theme and language changes, settings, and help.

To open help, launch the command palette, search for **Help**, and select the matching action.

Useful keys:

| Key                                 | Behavior                                                               |
| ----------------------------------- | ---------------------------------------------------------------------- |
| <kbd>Escape</kbd>                   | Close the active dialog, expanded chart, or palette                    |
| Arrow keys                          | Navigate grids, tabs, supported tables, and drilldown periods          |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activate the focused interactive row or control                        |
| <kbd>1</kbd>–<kbd>9</kbd>           | Select one of the first nine visible actions while the palette is open |

## Understand local state

The dashboard does not send usage data to a hosted TTDash service. It reads and writes through the same-origin local server. Browser preferences are normalized through the server settings contract; usage data is normalized before persistence.

Continue with [Exports and backups](/ttdash/guides/exports-backups/) or use [Troubleshooting](/ttdash/guides/troubleshooting/) when a view is empty or incomplete.
