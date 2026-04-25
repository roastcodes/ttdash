# Fixed Findings

## 2026-04-25

### performance-review.md / H-01

- Status: fixed
- Scope: secondary cost-analysis charts now leave the initial dashboard bundle and load through the section warmup path. Dashboard sections also get an adaptive, deduplicated preload scheduler that starts visible lazy section chunks shortly after the first render and keeps IntersectionObserver preloading far enough ahead of the viewport to avoid visible lazy-loading gaps while scrolling.
- Guardrails: `tests/frontend/dashboard-motion.test.tsx` covers idle/fallback scheduling, deduplication, cancellation, early preloading, and inert hidden content. `tests/unit/dashboard-section-preloading.test.ts` covers visible-section queue ordering, hidden/request-data gating, and duplicate task removal.
- Follow-up quality fixes during implementation:
  - Cost-analysis entry charts (`CostOverTime`, `CostByModel`) were moved from static dashboard imports to lazy chunks, reducing the built main `index` chunk from roughly `212 kB` raw / `57 kB` gzip to roughly `198 kB` raw / `53 kB` gzip.
  - The warmup scheduler now uses a short idle timeout with bounded parallelism so deeper sections are warmed without waiting for late viewport proximity.
  - Section placeholders for deeper analysis/table areas now better match final section heights, preventing scroll-command layout shift while lazy chunks complete above the target section.
- Validation:
  - `npm run test:unit -- tests/frontend/dashboard-motion.test.tsx tests/unit/dashboard-section-preloading.test.ts`
  - `npx playwright test tests/e2e/command-palette.spec.ts -g "executes analysis section navigation commands"`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `tsc --noEmit`
  - `npm run build:app`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues

### performance-review.md / M-01

- Status: fixed
- Scope: dashboard filter changes now flow through a centralized `deriveDashboardFilterData(...)` pass that derives date/month filtering, provider/model filtering, available filter options, date range, and view-mode aggregation behind the stable `useDashboardFilters` contract. Computed dashboard summaries now share one normalized breakdown aggregation for model costs, provider metrics, and model options behind the stable `useComputedMetrics` contract.
- Guardrails: `tests/unit/dashboard-filter-data.test.ts` compares the new filter derivation with the previous staged semantics across representative filter combinations and empty states. `tests/unit/dashboard-aggregation.test.ts` locks normalized model/provider aggregation and day counting. `tests/frontend/use-computed-metrics.test.tsx` covers the public computed-metrics hook boundary.
- Follow-up quality fixes during implementation:
  - `src/lib/dashboard-filter-data.ts` imports directly from the shared dashboard-domain contract instead of routing through broader frontend transform helpers, keeping the hook dependency graph smaller and the architecture layer test below its timeout budget.
  - `src/lib/data-transforms.ts` now fills scalar chart arrays and model-name discovery in one sorted-data pass instead of separate `map(...)` and `flatMap(...)` passes.
  - `computeModelCosts(...)` and `computeProviderMetrics(...)` now delegate to the shared breakdown summary, so standalone calculation callers and dashboard hook callers use the same aggregation path.
  - After CodeRabbit review, computed `allModels` now unions `modelsUsed` and `modelBreakdowns`, so inconsistent imported data can no longer hide a breakdown-backed model from the model-over-time chart while existing modelsUsed-only behavior remains preserved.
- Validation:
  - `npm run test:unit -- tests/unit/dashboard-filter-data.test.ts tests/unit/dashboard-aggregation.test.ts tests/frontend/use-computed-metrics.test.tsx tests/frontend/use-dashboard-filters.test.tsx tests/unit/analytics.test.ts tests/unit/data-transforms.test.ts tests/unit/code-rabbit-phase4.test.ts`
  - `npm run test:unit -- tests/unit/dashboard-aggregation.test.ts tests/frontend/use-computed-metrics.test.tsx tests/unit/analytics.test.ts`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full` -> completed after the CodeRabbit follow-up fix
  - `npm run test:timings` -> completed after the CodeRabbit follow-up fix
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 1 minor issue fixed, round 3: 0 issues, round 4: 0 issues

### performance-review.md / M-02

- Status: fixed
- Scope: the Settings dialog no longer starts `/api/toktrack/version-status` when it opens. The dashboard shell now schedules one cancellable, idle-friendly toktrack latest-version warmup per browser session through `src/lib/toktrack-version-status.ts`, and the settings version hook only formats the shared session snapshot for the Maintenance tab.
- Guardrails: `tests/unit/toktrack-version-status.test.ts` covers the pinned initial snapshot, concurrent warmup deduplication, cached failure behavior, scheduled fallback warmup, and cancellation. `tests/frontend/settings-modal-version-status.test.tsx` covers warmed status rendering without a dialog-open fetch, the no-fetch dialog-open path, and cached failure reuse across reopen. `tests/frontend/dashboard-filter-visibility.test.tsx` covers that the dashboard shell wires the session warmup scheduler.
- Follow-up quality fixes during implementation:
  - `docs/architecture.md` now documents the session-wide toktrack version status cache as the owner of lookup state, while the settings modal hook is only the presentation adapter.
  - Dashboard tests mock the warmup scheduler explicitly so future dashboard renders cannot accidentally perform real toktrack version network work during component tests.
  - The server `/api/toktrack/version-status` contract and existing server-side success/failure TTL cache remain unchanged, so the fix changes when the UI asks for the status, not how the status is resolved.
- Validation:
  - `npm run test:unit -- tests/unit/toktrack-version-status.test.ts tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-tabs.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx tests/frontend/dashboard-error-state.test.tsx tests/unit/api.test.ts`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues

### dashboard-review.md / N-02

- Status: fixed
- Scope: `src/components/dashboard/DashboardSections.tsx` already consumes a single structured `DashboardSectionsViewModel`, and `src/lib/dashboard-view-model.d.ts` keeps the section data split into named section bundles instead of flat dashboard props. This closes the original broad `DashboardSectionsProps` concern without changing visible dashboard functionality, content, UI, or animations.
- Guardrails: `tests/architecture/dashboard-sections-contract.test.ts` now locks the public `DashboardSections` prop contract to one `viewModel` prop and keeps `DashboardSectionsViewModel` split into the intended layout, analysis, table, comparison, and interaction bundles.
- Follow-up quality fixes during implementation:
  - No production refactor was needed because the broader view-model boundary had already been introduced by `architecture-review.md / M-01`; this change adds a targeted regression guardrail so future section work does not reintroduce wide flat props.
  - `docs/architecture.md` already documents the intended DashboardSections boundary, so no duplicate architecture text was added.
- Validation:
  - `npm run test:architecture`
  - `npm run test:unit -- tests/frontend/dashboard-filter-visibility.test.tsx`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings` -> attempted twice; both runs failed under external CPU pressure with migrating 5s timeouts in existing unrelated frontend suites, while `npm run verify:full` had just completed the same coverage test set successfully; the new architecture guardrail itself stayed below 100ms in `npm run test:architecture`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files docs/review/fixed-findings.md tests/architecture/dashboard-sections-contract.test.ts` -> 0 issues

## 2026-04-24

### dashboard-review.md / N-01

- Status: fixed
- Scope: the dashboard action landscape now separates everyday data loading, export/use actions, and maintenance actions in the header, while the Command Palette mirrors the same intent split for load data, exports, and maintenance. Existing actions and command IDs remain available.
- Guardrails: `tests/frontend/header-links.test.tsx` covers localized header action groups and preserved button access, while `tests/frontend/command-palette-action-groups.test.tsx` covers localized Command Palette groups and stable command IDs.
- Follow-up quality fixes during implementation:
  - Header action rendering is now owned by a private `HeaderActions` composition inside `Header.tsx`, keeping the global header shell separate from action information architecture.
  - Command Palette action commands are grouped by intent instead of sharing one broad `Actions` bucket, without changing command handlers or `data-testid` contracts.
- Validation:
  - `npm run test:unit -- tests/frontend/header-links.test.tsx tests/frontend/command-palette-action-groups.test.tsx`
  - `npx playwright test tests/e2e/command-palette.spec.ts`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -f ...` -> only reported unrelated untracked `docs/application-stack-reference.md`; the file was not changed
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/components` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir tests/frontend` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir shared/locales` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir docs/review` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files docs/architecture.md` -> 0 issues

### dashboard-review.md / M-02

- Status: fixed
- Scope: `src/components/layout/FilterBar.tsx` was reduced to a composition shell over private filter groups for status, time presets, date range, and provider/model chips. The visible dashboard filtering capabilities remain intact while the bar now shows lightly grouped Time, Date range, Providers, and Models areas.
- Guardrails: `tests/frontend/filter-bar-accessibility.test.tsx` covers localized filter groups, while the existing date-picker and preset/chip suites continue to lock keyboard focus, date clearing, preset highlighting, and chip `aria-pressed`/visual states. `.dependency-cruiser.cjs` now keeps the new FilterBar internals private to the FilterBar shell.
- Follow-up quality fixes during implementation:
  - The custom date picker logic now lives in `FilterBarDateRange.tsx`, isolating its portal, overlay positioning, keyboard navigation, and focus restoration from the main filter shell.
  - Provider and model chip rendering now lives in `FilterBarChipFilters.tsx`, keeping provider badge styling and model color state local to chip filters.
  - Provider badge alpha variants now flow through `getProviderBadgeStyle(...)`, so included provider chips no longer parse or mutate CSS strings in the UI.
  - Date-picker calendar labels now recompute from the active locale while the picker is open, and weekday cells use stable keys.
- Validation:
  - `npm run test:unit -- tests/frontend/filter-bar-accessibility.test.tsx tests/frontend/filter-bar-date-picker.test.tsx tests/frontend/filter-bar-presets.test.tsx tests/unit/model-colors.test.ts`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -f ...` -> fixed relevant minor findings for weekday keys, provider badge alpha handling, locale-reactive calendar labels, and included-chip style collisions; remaining global uncommitted finding is isolated to unrelated untracked `docs/application-stack-reference.md`.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/components/layout` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/lib` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir tests` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir shared` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir docs/review` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files .dependency-cruiser.cjs` -> 0 issues

### dashboard-review.md / M-01

- Status: fixed
- Scope: `src/components/features/settings/SettingsModal.tsx` was changed from one long settings surface into a tabbed workspace with Basics, Layout, Limits, and Maintenance areas. Existing settings capabilities remain available, but day-to-day preferences are separated from section layout, provider limits, and backup/version-maintenance actions.
- Guardrails: `tests/frontend/settings-modal-tabs.test.tsx` covers default tab state, section grouping, and keyboard navigation, while the existing focused settings suites now exercise their sections through the relevant tab. `docs/architecture.md` documents the tabbed settings shell and split motion/toktrack version ownership.
- Follow-up quality fixes during implementation:
  - `SettingsModalSections.tsx` now separates the reduced-motion card from the toktrack version-status card so Maintenance can own diagnostic/version information without mixing it into daily dashboard behavior settings.
  - `SettingsModal.tsx` now resets the active settings tab while the dialog is closed, so reopening the dialog always starts from Basics without a transient stale tab render.
  - `tests/e2e/command-palette.spec.ts` now splits the formerly near-timeout section-navigation coverage into smaller scroll, dashboard-section, and analysis-section tests after the full gate exposed the old monolithic test as a reliability/performance risk.
- Validation:
  - `npm run test:unit -- tests/frontend/settings-modal-tabs.test.tsx tests/frontend/settings-modal-language.test.tsx tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-defaults.test.tsx tests/frontend/settings-modal-sections.test.tsx tests/frontend/settings-modal-backups.test.tsx tests/frontend/settings-modal-provider-limits.test.tsx tests/frontend/settings-modal-draft-state.test.tsx`
  - `npx playwright test tests/e2e/command-palette.spec.ts`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues

### code-review.md / N-01

- Status: fixed
- Scope: removed the unused `src/hooks/use-theme.ts` and `src/hooks/use-provider-limits.ts` files. Their active responsibilities already live in the persisted settings flow: theme application goes through `applyTheme` and dashboard controller effects, while provider-limit synchronization goes through `useAppSettings` and `syncProviderLimits`.
- Guardrails: `tests/architecture/unused-hooks.test.ts` now fails when a production hook file under `src/hooks/` has no production import, and `docs/architecture.md` plus `docs/testing.md` document that unused hook helpers should be removed instead of retained as speculative code.
- Follow-up quality fixes during implementation:
  - The guardrail covers the same dead-hook visibility gap that made the original `0%` coverage files easy to miss, so future unused hook files are caught by `npm run test:architecture`.
- Validation:
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run test:unit -- tests/frontend/react-query-hooks.test.tsx tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `47 minutes and 10 seconds`)

### code-review.md / M-01

- Status: fixed
- Scope: dashboard date preset behavior is centralized in the shared dashboard preferences contract. `src/hooks/use-dashboard-filters.ts` applies presets through `resolveDashboardPresetRange`, and `src/components/layout/FilterBar.tsx` derives the active UI state through `resolveDashboardActivePreset`; both flow through `src/lib/dashboard-preferences.ts` to `shared/dashboard-preferences.js`, so applying and displaying presets no longer duplicate the `7d`, `30d`, `month`, `year`, and `all` rules.
- Guardrails: `tests/unit/dashboard-preferences.test.ts` locks the shared/frontend preset contract, while `tests/frontend/use-dashboard-filters.test.tsx` and `tests/frontend/filter-bar-presets.test.tsx` cover applying presets in the hook and highlighting them in the filter bar.
- Follow-up quality fixes during implementation:
  - No production or test changes were needed for this finding because the shared preset contract and focused regression coverage already existed; the fix was to document the concrete `code-review.md / M-01` reference as closed.
- Validation:
  - `npm run test:unit -- tests/unit/dashboard-preferences.test.ts tests/frontend/use-dashboard-filters.test.tsx tests/frontend/filter-bar-presets.test.tsx`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 2 minor documentation issues, fixed
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `57 minutes and 23 seconds`)

### code-review.md / M-02

- Status: fixed
- Scope: `src/components/features/settings/SettingsModal.tsx` was reduced from the former 1000+ line all-in-one dialog into a shell/composition root over extracted settings sections, a draft-state hook, a version-status hook, and modal-local helper logic. The visible settings areas now live behind `src/components/features/settings/SettingsModalSections.tsx`, while the draft/save/reset behavior moved into `use-settings-modal-draft.ts` and the toktrack lookup behavior moved into `use-settings-modal-version-status.ts`.
- Guardrails: `docs/architecture.md` now documents the settings modal shell, internal section bundle, and private helper hooks as a feature-internal composition boundary, and `.dependency-cruiser.cjs` now blocks unrelated frontend modules from importing `SettingsModalSections.tsx`, `use-settings-modal-draft.ts`, `use-settings-modal-version-status.ts`, or `settings-modal-helpers.ts` directly.
- Follow-up quality fixes during implementation:
  - `src/components/features/settings/settings-modal-helpers.ts` now owns the extracted number parsing, selection normalization, provider-limit draft building/patching, and section reorder helpers so tests no longer import utility behavior through the UI shell.
  - `use-settings-modal-draft.ts` now clones incoming section drafts and patches empty provider configs from `DEFAULT_PROVIDER_LIMIT_CONFIG`, preserving the previous provider-limit safety behavior after the refactor.
  - `use-settings-modal-draft.ts` now initializes modal drafts once per open session and resets that guard on close, so external prop churn can no longer overwrite in-progress edits while the dialog remains open.
  - `tests/unit/settings-modal-helpers.test.ts` now covers the extracted settings helpers directly, and `tests/unit/code-rabbit-phase1.test.ts` was narrowed back to the unrelated chart/auto-import helpers it actually owns.
  - `tests/frontend/settings-modal-defaults.test.tsx`, `settings-modal-sections.test.tsx`, `settings-modal-backups.test.tsx`, `settings-modal-provider-limits.test.tsx`, and `settings-modal-draft-state.test.tsx` now split the modal coverage by responsibility instead of adding another broad catch-all dialog suite.
- Validation:
  - `npm run test:unit -- tests/unit/settings-modal-helpers.test.ts tests/unit/code-rabbit-phase1.test.ts tests/frontend/settings-modal-language.test.tsx tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-defaults.test.tsx tests/frontend/settings-modal-sections.test.tsx tests/frontend/settings-modal-backups.test.tsx tests/frontend/settings-modal-provider-limits.test.tsx`
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:timings`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run verify:release`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, fixed (draft state no longer reinitializes while the modal stays open; `tests/frontend/settings-modal-draft-state.test.tsx` added)
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `54 minutes and 32 seconds`)

### code-review.md / H-01

- Status: fixed
- Scope: `src/hooks/use-dashboard-controller.ts` was reduced from the remaining god-hook into a composition root over focused internal controller slices. The heavy derived state, browser IO, dialog ownership, drill-down navigation, shell/load state, and imperative dashboard actions now live in `src/hooks/use-dashboard-controller-actions.ts`, `use-dashboard-controller-browser.ts`, `use-dashboard-controller-derived-state.ts`, `use-dashboard-controller-dialogs.ts`, `use-dashboard-controller-drill-down.ts`, `use-dashboard-controller-effects.ts`, and `use-dashboard-controller-shell-state.ts`, while the public controller contract stayed stable through `src/hooks/use-dashboard-controller.ts`.
- Guardrails: `docs/architecture.md` now documents the internal dashboard controller slices and the browser-IO helper as private implementation details behind the public controller hook, and `.dependency-cruiser.cjs` now blocks component-level fanout to the internal `use-dashboard-controller-*.ts` slices while keeping the intentional type-only controller contract out of the orphan warning path.
- Follow-up quality fixes during implementation:
  - `tests/frontend/dashboard-controller-browser.test.tsx` now locks the extracted browser helper responsibilities for JSON downloads, section scrolling, and the test-only `openSettings` bridge.
  - `tests/frontend/dashboard-controller-drill-down.test.tsx` now covers the extracted drill-down slice directly, including the edge case where the selected day disappears after filtering changes.
  - `src/hooks/use-dashboard-controller-actions.ts` now uses the upload-specific fallback toast (`api.uploadFailed`) after a successful JSON parse when the backend rejects a usage upload without an `Error` instance, and `tests/frontend/dashboard-error-state.test.tsx` covers that regression explicitly.
  - `npm run test:timings` showed no new performance hotspot in the touched dashboard/controller suites; the new slice tests stay sub-100ms and the existing dashboard controller/public-shell tests remained fast.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:timings`
  - `npm run test:unit -- tests/frontend/dashboard-controller-browser.test.tsx tests/frontend/dashboard-controller-drill-down.test.tsx tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx tests/frontend/dashboard-error-state.test.tsx`
  - `npm run test:unit -- tests/frontend/dashboard-error-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-controller-browser.test.tsx`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run verify:release`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, fixed (`api.uploadFailed` fallback for backend upload rejection after successful JSON parse)
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `52 minutes and 50 seconds`)

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

### architecture-review.md / M-02

- Status: fixed
- Scope: dashboard preset, section, and settings-adjacent UI rules now flow through `shared/dashboard-preferences.js` with declarations in `shared/dashboard-preferences.d.ts`; `shared/app-settings.js` consumes that shared contract, `src/lib/dashboard-preferences.ts` was reduced to a thin adapter, and the duplicated preset semantics were removed from `src/hooks/use-dashboard-filters.ts` and `src/components/layout/FilterBar.tsx`.
- Guardrails: `docs/architecture.md` now documents the shared dashboard contract separately from the app settings contract, `.dependency-cruiser.cjs` blocks production imports of `shared/dashboard-preferences.json` outside `shared/dashboard-preferences.js`, and `vitest.config.ts` now includes `shared/dashboard-preferences.js` in coverage.
- Follow-up quality fixes during implementation:
  - `tests/unit/dashboard-preferences.test.ts` now locks the shared/frontend adapter alignment for config parsing, section metadata, preset-range resolution, and active-preset detection.
  - `tests/frontend/use-dashboard-filters.test.tsx` now asserts preset application and reset behavior against the shared preset resolver instead of re-hardcoding date ranges.
  - `tests/frontend/filter-bar-presets.test.tsx` now seeds active-preset UI states from the shared resolver while preserving the existing visible quick-select order.
  - `src/lib/dashboard-view-model.d.ts` and `src/hooks/use-dashboard-controller.ts` now type preset actions with `DashboardDatePreset` instead of broad strings.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues
