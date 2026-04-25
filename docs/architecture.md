# Architecture Guardrails

TTDash uses three complementary architecture gates. Each tool owns a different structural concern so the repo gets stronger boundaries without duplicating the same rule in multiple places.

## Tool Responsibilities

- `dependency-cruiser`
  - owns whole-repo dependency graph health
  - enforces production dependency boundaries and cycle checks
- `eslint-plugin-boundaries`
  - owns fast frontend import-layer discipline inside `src/**`
  - keeps hooks, `lib`, and UI layers pointed in the intended direction
  - also ensures every production file in `src/**` belongs to a known frontend layer
- `archunit`
  - owns small, executable architecture tests that are easier to express as rules than as lint config
  - covers runtime boundaries, hook naming, and other intentional structural constraints

## Runtime Dependency Model

- `src/**`
  - frontend-only code
  - may depend on `shared/**`
  - must not depend on `server/**` or `server.js`
- `server.js`
  - CLI entrypoint, bootstrap, and composition root for the local server runtime
  - may depend on `server/**` and `shared/**`
  - should compose injected runtime modules instead of owning subsystem internals directly
- `server/**`
  - local API, reporting, background process, persistence, auto-import, and package runtime modules
  - may depend on `shared/**`
  - must not depend on `src/**` or `server.js`
- `shared/**`
  - neutral runtime/domain utilities and shared assets
  - owns cross-runtime contracts such as `shared/app-settings.js` for persisted settings defaults and normalization
  - must not depend on `src/**`, `server/**`, `server.js`, or `usage-normalizer.js`
- `usage-normalizer.js`
  - standalone normalization logic
  - must stay independent from frontend and server modules

## Server Composition

The server runtime is intentionally split so `server.js` stays an orchestration layer instead of a catch-all implementation module.

- `server/data-runtime.js`
  - owns app-path resolution, persisted usage/settings IO, migration, and file-mutation locks
  - consumes the shared settings contract instead of defining local settings defaults or normalizers
- `server/background-runtime.js`
  - owns background instance registry, start/stop flows, and registry locking
- `server/auto-import-runtime.js`
  - owns toktrack runner resolution, subprocess execution, version lookup, and auto-import execution
- `server/http-router.js`
  - owns API routing, SSE wiring, and static asset dispatch with injected runtime dependencies
- `server/remote-auth.js`
  - owns token-based authentication for explicitly enabled non-loopback binds
  - keeps browser bootstrap and non-browser Bearer/header auth outside the route handlers
- `server/http-utils.js`, `server/runtime.js`, `server/report/**`
  - shared support modules used by the composed runtimes

## Shared Settings Contract

Persisted settings are a shared contract across the frontend bootstrap path and the server persistence/runtime path.

- `shared/app-settings.js`
  - owns app-level settings defaults, provider-limit normalization, and timestamp/load-source coercion
  - consumes `shared/dashboard-preferences.js` for dashboard-specific filter/section defaults and normalization
  - is the only production module that should define persisted settings defaults or normalization rules
- `src/lib/app-settings.ts`
  - is a typed frontend adapter over `shared/app-settings.js`
  - may keep DOM-only behavior such as `applyTheme`, but must not recompute settings defaults from local helpers
- `server/data-runtime.js`
  - must normalize and default persisted settings through `shared/app-settings.js`
  - must not derive settings defaults from raw dashboard preference JSON

## Shared Dashboard Contract

Dashboard-specific presets, static section metadata, and preset date semantics are shared domain rules across settings, filters, and command/navigation surfaces.

- `shared/dashboard-preferences.js`
  - owns validated dashboard preference config from `shared/dashboard-preferences.json`
  - owns shared dashboard preset semantics such as preset-range resolution and active-preset detection
  - is the only production module that should read the raw dashboard preferences JSON
- `src/lib/dashboard-preferences.ts`
  - is a thin frontend adapter over `shared/dashboard-preferences.js`
  - may keep UI-specific rendering choices such as quick-select button order, but must not duplicate preset/filter semantics
- `shared/app-settings.js`
  - must consume dashboard defaults and normalization from `shared/dashboard-preferences.js` instead of re-declaring them locally

## Frontend Layer Model

- `app-shell`
  - `src/App.tsx`
  - `src/main.tsx`
- `components`
  - `src/components/**`
- `hooks`
  - `src/hooks/**`
  - hook files must be imported by production code; unused hook files should be removed instead of kept as speculative helpers
- `lib-react`
  - `src/lib/**/*.tsx`
- `lib-core`
  - `src/lib/**/*.ts`
- `types`
  - `src/types/**`

## Dashboard Composition

- `src/hooks/use-dashboard-controller.ts`
  - owns the public dashboard orchestration contract and composes the internal controller slices into the final view model
- `src/hooks/use-dashboard-controller-*.ts`
  - own the internal controller slices for derived data, dialogs, drill-down, shell state, browser IO, effects, and imperative actions
  - are implementation details behind `use-dashboard-controller.ts`, not component-level dependencies
- `src/components/Dashboard.tsx`
  - is the only production composition root that should consume `use-dashboard-controller.ts`
  - wires the controller bundles into `Header`, `FilterBar`, dialogs, `CommandPalette`, and `DashboardSections`
- `src/components/layout/Header.tsx` and `src/components/features/command-palette/CommandPalette.tsx`
  - group dashboard actions by user intent so data loading, exports, maintenance, filters, navigation, and view actions stay discoverable without collapsing into one undifferentiated action surface
- `src/lib/dashboard-view-model.d.ts`
  - owns the shared frontend-only view-model contracts for the dashboard shell and sections
- `src/lib/toktrack-version-status.ts`
  - owns the session-wide toktrack latest-version warmup cache so settings can render status without coupling dialog opening to the registry lookup
- `src/lib/drill-down-data.ts`, `src/lib/heatmap-calendar-data.ts`, `src/lib/request-quality-data.ts`, `src/lib/sortable-table-data.ts`, and `src/lib/filter-date-picker-data.ts`
  - own non-presentational data derivation for complex dashboard UI islands so components can keep rendering, accessibility, and motion concerns separate from calculation-heavy view data
- `src/hooks/use-dashboard-controller-browser.ts`
  - owns dashboard-specific browser IO such as download anchors, section scrolling, and the test-only `openSettings` bridge
  - keeps DOM concerns out of the main controller orchestration file
- `src/components/dashboard/DashboardSections.tsx`
  - consumes a single `DashboardSectionsViewModel`
  - should keep section ownership grouped by section bundle instead of reintroducing broad prop lists
- `src/components/layout/FilterBar.tsx`
  - owns the public filter bar shell and composes private layout filter groups for status, time presets, date range, and provider/model chips
- `src/components/layout/FilterBar*.tsx`
  - are private FilterBar internals, not shared UI primitives; unrelated modules should consume `FilterBar.tsx` only

## Settings Modal Composition

- `src/components/features/settings/SettingsModal.tsx`
  - owns the tabbed dialog shell and composes the internal settings sections and draft/version hooks
  - groups settings by user intent: basics, layout, limits, and maintenance
- `src/components/features/settings/SettingsModalSections.tsx`
  - owns the extracted section subviews for status, language, defaults, dashboard motion, toktrack version, backups, section layout, and provider limits
- `src/components/features/settings/use-settings-modal-draft.ts`
  - owns the editable settings draft state, reset behavior, and save orchestration for the modal
- `src/components/features/settings/use-settings-modal-version-status.ts`
  - formats the session-wide toktrack version status shown in the modal
- `src/components/features/settings/settings-modal-helpers.ts`
  - owns modal-specific draft helpers such as provider-limit patching, selection normalization, and section reordering
- these settings-modal internals are private to the settings feature
  - other frontend modules should consume `SettingsModal.tsx`, not its internal helper files directly

Important expectations:

- generic UI primitives belong in `src/components/ui/**`, not inside feature folders
- hooks must not import components
- `lib-core` stays free of React, Recharts, Radix, Framer Motion, and React Query
- if a helper becomes shared across multiple features, move it into a neutral shared location instead of layering more exceptions on top

Current `eslint-plugin-boundaries` stance:

- enabled:
  - `boundaries/dependencies`
  - `boundaries/no-unknown`
  - `boundaries/no-unknown-files`
- intentionally not enabled:
  - `boundaries/entry-point`
  - `boundaries/no-private`

Reason: the repo has stable layer boundaries, but it is not structured around strict public barrel entrypoints. Enabling `entry-point` or `no-private` now would add config noise and refactor pressure without a proportional architecture gain.

## Commands

- dependency graph validation: `npm run check:deps`
- dependency graph visualization: `npm run deps:graph`
- architecture tests only: `npm run test:architecture`
- main release-style local gate: `npm run verify:full`

Both `ci.yml` and `release.yml` run `check:deps` and `test:architecture` explicitly so dependency and architecture violations show up as separate CI failures instead of being hidden inside a larger local gate.

## Contributor Rules

- Add a new rule only when it protects a real structural boundary the repo already intends to keep.
- Prefer the narrowest tool:
  - use `dependency-cruiser` for whole-repo dependency graph boundaries
  - use `eslint-plugin-boundaries` for frontend import discipline
  - use `archunit` for expressive architecture assertions and naming rules
- Keep `server.js` small. New server behavior should usually land in `server/**` and be wired into the entrypoint via dependency injection.
- Keep shared settings logic centralized. If a new persisted settings field, default, or normalization rule is added, update `shared/app-settings.js` first and adapt frontend/server wrappers afterward.
- Keep dashboard orchestration bundled. New dashboard shell behavior should usually extend the controller/view-model contracts instead of adding new flat props to `Dashboard.tsx` or `DashboardSections.tsx`.
- Keep dashboard controller internals private. New browser-side dashboard IO or orchestration helpers should usually live in `use-dashboard-controller-*.ts` and be composed by `use-dashboard-controller.ts`, not imported directly by components.
- Keep settings modal internals private. New settings-modal sections, draft helpers, or version-status logic should stay under `src/components/features/settings/**` and be composed by `SettingsModal.tsx`, not imported directly by unrelated features.
- Do not add broad allowlists just to get green. Fix the code or scope the rule explicitly.
- If a feature helper becomes cross-feature, move it out of `src/components/features/**` before adding more exceptions.
