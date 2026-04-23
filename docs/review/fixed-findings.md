# Fixed Findings

## 2026-04-23

### architecture-review.md / H-01

- Status: fixed
- Scope: `server.js` was reduced to the CLI/bootstrap and runtime composition root; subsystem logic moved into `server/data-runtime.js`, `server/background-runtime.js`, `server/auto-import-runtime.js`, and `server/http-router.js`.
- Guardrails: `docs/architecture.md` now documents the server split, `.dependency-cruiser.cjs` prevents runtime modules from coupling back to `server.js`, the router, or each other, and `tests/unit/background-runtime.test.ts` locks the background registry snapshot behavior that was tightened during the review cycle.
- Follow-up quality fixes during implementation:
  - `server/background-runtime.js`: removed a snapshot TOCTOU re-read so background pruning now decides cleanup from one captured registry read.
  - `src/components/layout/FilterBar.tsx`: added cleanup for queued focus-restoration callbacks; `tests/frontend/filter-bar-date-picker.test.tsx` now covers the unmount path that was causing the flaky date-picker teardown in Playwright.
- Validation:
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run test:unit -- tests/unit/server-helpers-network.test.ts tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts tests/unit/server-helpers-file-locks.test.ts tests/integration/server-auto-import.test.ts tests/integration/server-background.test.ts tests/integration/server-api-guards.test.ts`
  - `npm run verify:full`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, round 2: 0 issues

### architecture-review.md / H-02

- Status: fixed
- Scope: the duplicated client/server settings contract was consolidated into `shared/app-settings.js` with typed declarations in `shared/app-settings.d.ts`; frontend adapters in `src/lib/app-settings.ts`, `src/lib/dashboard-preferences.ts`, and `src/lib/provider-limits.ts` now consume that shared contract, and `server/data-runtime.js` now normalizes persisted settings through the same source.
- Guardrails: `docs/architecture.md` now documents `shared/app-settings.js` as the single production source for persisted settings defaults and normalization, `.dependency-cruiser.cjs` blocks bypassing that contract from `server.js`, `server/data-runtime.js`, and `src/lib/app-settings.ts`, and `vitest.config.ts` now includes `shared/app-settings.js` in coverage reporting.
- Follow-up quality fixes during implementation:
  - `tests/unit/app-settings-contract.test.ts`: locks the shared/frontend contract alignment for defaults, fragment normalization, persisted settings normalization, and runtime-only flags.
  - `tests/integration/server-api-imports.test.ts`: now asserts the normalized settings-import response instead of only the status code.
  - `tests/integration/server-api-persistence.test.ts` and `tests/frontend/settings-modal-test-helpers.tsx`: now derive defaults from the shared settings contract instead of re-hardcoding them in tests.
  - `tests/unit/background-runtime.test.ts`: cleaned up type-only imports to keep the repo lint/type gates green after the shared typings were added.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:unit -- tests/unit/app-settings-contract.test.ts tests/unit/api.test.ts tests/unit/dashboard-preferences.test.ts tests/integration/server-api-persistence.test.ts tests/integration/server-api-imports.test.ts`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues

### architecture-review.md / M-01

- Status: fixed
- Scope: the dashboard orchestration was cut from a broad flat controller surface into focused view-model bundles in `src/hooks/use-dashboard-controller.ts`; `src/components/Dashboard.tsx` now consumes `header`, `filterBar`, `sections`, `settingsModal`, `dialogs`, `commandPalette`, `report`, and shell bundles instead of forwarding dozens of individual fields, and `src/components/dashboard/DashboardSections.tsx` now consumes one structured `DashboardSectionsViewModel`.
- Guardrails: `src/lib/dashboard-view-model.d.ts` now owns the shared frontend-only dashboard view-model contracts, `docs/architecture.md` documents `Dashboard.tsx` as the controller composition root, and `.dependency-cruiser.cjs` now blocks component-subtree fanout to `src/hooks/use-dashboard-controller.ts`.
- Follow-up quality fixes during implementation:
  - `src/components/layout/Header.tsx`, `src/components/layout/FilterBar.tsx`, `src/components/features/command-palette/CommandPalette.tsx`, and `src/components/features/settings/SettingsModal.tsx` now type their props from the shared dashboard view-model contracts instead of re-declaring local prop shapes.
  - `tests/frontend/dashboard-controller-test-helpers.ts` now provides bundle-based controller and section factories, so dashboard composition tests no longer rebuild a flat mega-mock.
  - `tests/frontend/dashboard-controller-actions.test.tsx` now covers drill-down navigation from the controller-owned dialog bundle, locking the logic that moved out of `Dashboard.tsx`.
  - `tests/frontend/dashboard-filter-visibility.test.tsx` now also asserts that `DashboardSections` receives a structured `viewModel` bundle instead of flat section props.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:unit -- tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues
