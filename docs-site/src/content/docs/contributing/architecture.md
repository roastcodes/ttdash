---
title: Architecture
description: Runtime boundaries, composition roots, shared contracts, and enforced frontend layers.
---

TTDash is one distributable package with two runtime halves: a Vite/React browser app and a local CommonJS server/CLI. Neutral domain contracts in `shared/` connect them without allowing either half to depend on the other.

## Runtime dependency model

```text
src/** ───────────────┐
                     ├──> shared/**
server/** ────────────┘
    ▲
    │ composed by
server/app-runtime.js
    ▲
    │ started by
server.js

usage-normalizer.js   (standalone)
```

The enforced responsibilities are:

| Area                    | Ownership and allowed dependencies                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/**`                | Browser-only React application; may use `shared/**`, never `server/**`                                    |
| `server.js`             | Executable package/CLI shim; creates the runtime and starts the CLI path                                  |
| `server/app-runtime.js` | Server composition root; injects persistence, auth, HTTP, background, reporting, and auto-import services |
| `server/**`             | Local API and process runtime; may use `shared/**`, never `src/**`                                        |
| `shared/**`             | Cross-runtime domain contracts; independent of frontend and server modules                                |
| `usage-normalizer.js`   | Standalone input normalization with no frontend/server dependency                                         |

## Server composition

The server is split into focused facades and services so `server.js` never becomes a catch-all:

- `data-runtime.js` composes app paths, secure/atomic file I/O, mutation locks, and conservative backup merge logic
- `auto-import-runtime.js` composes toktrack runner discovery, commands, timeouts, progress events, version lookup, and import execution
- `http-router.js` authenticates and dispatches API/static requests through injected runtime dependencies
- `http-request-guards.js` owns Host, Origin, Fetch Metadata, and JSON content-type policy
- `remote-auth.js` owns local bootstrap auth, remote master tokens, in-memory browser sessions, and rate limits
- `background-runtime.js` owns detached instance start/stop, logs, and the instance registry
- `startup-runtime.js` owns startup summaries, browser opening, and current local session metadata
- `server-lifecycle.js` owns HTTP server lifecycle, startup sequencing, and shutdown cleanup
- `report/**` owns Typst report data and rendering

Mutable state such as the active import lease and cached registry lookup lives inside one composed app runtime, not module-global route flags. This keeps isolated integration and browser test servers deterministic.

## Persistence and shared contracts

`shared/app-settings.js` is the only production owner of persisted settings defaults and normalization. It consumes `shared/dashboard-preferences.js`, which owns supported view modes, date presets, section metadata, and default filters.

The browser uses typed adapters; the server uses the same CommonJS contracts before reading or writing `settings.json`. Sibling `.d.ts` declarations expose matching value exports and are guarded by architecture tests.

When a persisted setting changes:

1. update the shared contract and defaults
2. adapt server and frontend consumers
3. update backup/import behavior where relevant
4. extend contract and migration tests
5. update the public configuration or API reference

## Frontend layers

The frontend dependency direction is enforced by `eslint-plugin-boundaries`:

- `app-shell`: `App.tsx` and `main.tsx`
- `components`: presentational and feature UI under `src/components/**`
- `hooks`: reusable state and dashboard orchestration under `src/hooks/**`
- `lib-react`: React-specific library modules
- `lib-core`: framework-independent TypeScript utilities
- `types`: TypeScript-only contracts

Hooks must not import components. `lib-core` must remain free of React, Recharts, Radix, Framer Motion, and React Query. Generic primitives belong in `components/ui`; feature-specific UI stays below its feature folder.

## Dashboard composition

`use-dashboard-controller.ts` is the public orchestration contract. Focused `use-dashboard-controller-*.ts` slices own effects, browser I/O, dialogs, drilldowns, derived state, shell state, and imperative actions.

`Dashboard.tsx` is the single production composition root that consumes the controller. It passes grouped view models to the header, filters, dialogs, command palette, and section renderer. New behavior should extend these bundles rather than reintroducing long flat prop lists.

Complex non-presentational derivations—drilldowns, heatmap data, request quality, sortable tables, and date-picker data—belong in focused `src/lib` modules rather than render components.

## Architecture gates

Three tools cover different concerns:

| Tool                               | Responsibility                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `dependency-cruiser`               | Whole-repository dependency boundaries and cycle detection                      |
| `eslint-plugin-boundaries`         | Fast frontend layer classification and import direction                         |
| `archunit` plus source-graph tests | Executable placement, naming, reachability, and higher-level architecture rules |

Run the gates locally:

```bash
npm run check:deps
npm run test:architecture
npm run test:static
npm run deps:graph
```

## Documentation boundary

The public site is another explicit boundary:

- `docs-site/src/content/docs/**` is the only public content collection
- `docs-site/public/**` contains reviewed public assets only
- the site never scans the repository root or legacy/internal `docs/**` files
- a publication verifier rejects untracked, ignored, symlinked, or forbidden content before deployment

When a runtime surface changes, update its canonical page and the behavior-oriented documentation contract test in the same change.

## Contributor rules

- Add architecture rules only for boundaries the codebase actually intends to keep.
- Prefer the narrowest tool that proves a rule.
- Keep `server.js` an executable shim and wire new server services through `app-runtime.js`.
- Centralize shared settings and dashboard defaults instead of duplicating them in adapters.
- Keep dashboard and settings-modal internals behind their public composition modules.
- Move a helper to a neutral location when it becomes cross-feature.
- Fix violations instead of adding broad allowlists.

The repository's [contributor guide](https://github.com/roastcodes/ttdash/blob/main/CONTRIBUTING.md) covers workflow and review expectations.
