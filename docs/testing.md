# Testing Architecture

TTDash uses four test layers. Add new coverage at the narrowest layer that can prove the behavior.

Architecture constraints are documented separately in [`docs/architecture.md`](./architecture.md). Use that file as the source of truth for dependency rules, layer ownership, and architecture-specific gates.

## Test Layers

- `tests/unit`
  - Pure logic, transforms, formatting, small server helpers, and domain rules
  - Prefer no DOM and no browser mocks
- `tests/frontend`
  - React component behavior in `jsdom`
  - Use this for UI state, accessibility, motion behavior, localization, and chart wiring
- `tests/integration`
  - Local server, CLI, filesystem, background process, and API behavior without a browser
  - Prefer these over Playwright when a real browser is not required
- `tests/e2e`
  - Browser flows with Playwright
  - Keep these focused on end-to-end user journeys and smoke coverage

## Standard Helpers

- Use `renderWithAppProviders(...)` from [tests/test-utils.tsx](../tests/test-utils.tsx) for most frontend tests.
  - It provides the shared `TooltipProvider`.
  - Do not wrap `TooltipProvider` manually unless the test needs a special provider arrangement.
- Use `renderHookWithQueryClient(...)` for React Query hook tests.
  - Do not create ad hoc `QueryClientProvider` wrappers in each file.
- Use [tests/recharts-test-utils.tsx](../tests/recharts-test-utils.tsx) for chart mocks.
  - Prefer valid `<svg>` / `<g>` containers over `<div>` placeholders when mocking Recharts internals.

## Frontend Defaults

- `vitest.setup.node.ts` is the minimal shared cleanup for Node-only projects.
- `vitest.setup.frontend.ts` is the shared place for `jsdom` defaults such as:
  - i18n bootstrapping
  - `matchMedia`
  - `ResizeObserver`
  - default `IntersectionObserver`
- The `frontend` Vitest project owns the shared `30s` jsdom timeout because coverage instrumentation
  can make a few otherwise-synchronous render tests exceed Vitest's default `5s` timeout under load.
  Do not add per-test timeout overrides for routine frontend render tests.
- Only override `IntersectionObserver` locally when the test explicitly verifies reveal or visibility behavior.
- Only call `initI18n(...)` inside a test file when locale switching is itself part of the assertion.

## Async Test Rules

- Prefer direct assertions after the user action whenever possible.
- Use `findBy...` when the DOM is expected to settle to one concrete async state.
- Use `waitFor(...)` only for real eventual consistency:
  - hook state transitions
  - delayed observer/motion updates
  - server/process state that cannot be awaited directly
- Do not use `waitFor(...)` as a generic replacement for deterministic assertions.

## File Placement and Scope

- Prefer focused files over large “catch-all” regression suites.
- If one file starts covering unrelated areas, split it by behavior:
  - component state
  - localization
  - keyboard/accessibility
  - motion/reveal behavior
- For large server helper or integration suites, group tests by subsystem so Vitest can schedule them more efficiently.
- Keep background-process integration files focused by behavior; the background Vitest project intentionally uses a small worker cap instead of one serial catch-all file or unbounded process fan-out.
- Keep Playwright files grouped by end-to-end journey, such as load/upload, forecast/filter interaction, settings/backups, reporting, and command palette behavior. Import `test` and `expect` from `tests/e2e/fixtures.ts` so each worker gets its own server, port, auth session, and runtime directory. Share authentication, server reset, seeding, and download helpers through `tests/e2e/helpers.ts` instead of creating new browser catch-all files.
- Every Playwright spec must reset state through `resetAppState(...)` or prepare an isolated dashboard through `prepareDashboard(...)` before it asserts app behavior. `tests/unit/playwright-config.test.ts` fails when a new spec skips that isolation contract.
- `tests/unit/playwright-config.test.ts` also guards the small E2E journey list, the shared fixture import, CI worker cap, and Playwright reporter paths. Update that contract intentionally when adding a new browser journey.

## Choosing the Right Layer

- Use `tests/unit` when the behavior can be proven without a DOM, a real server, or filesystem side effects.
- Prefer `tests/frontend` when the assertion is about rendered UI behavior, localization, accessibility, motion, or chart wiring.
- Reach for `tests/integration` when browser rendering is irrelevant but the real server, CLI, persistence, background processes, or filesystem coordination matters.
- Reserve `tests/e2e` for behavior that depends on a real browser journey across multiple surfaces.

Choose the narrowest layer that can still falsify the behavior. Do not promote a test to Playwright if the same behavior can be proven in `jsdom` or with server integration.

For `tests/architecture`, prefer the shared source graph helper for simple file, naming, placement, and direct import rules over `src/**`. Keep ArchUnit for higher-level architecture models such as feature-slice diagrams where its abstraction is worth the extra scan cost.

## Real Processes vs Test Doubles

- Prefer injected test doubles such as fake children or `spawnImpl` hooks for timeout, stderr/stdout, and process-lifecycle policy.
- Use real subprocesses only when the behavior genuinely depends on:
  - `PATH` lookup
  - shell executable resolution
  - CLI startup and background coordination
  - cross-process locking semantics
- If a test needs a real subprocess, isolate it in its own focused file whenever possible.
- For subprocess concurrency tests, prefer deterministic readiness and release signals over fixed sleeps so the test waits for the real state transition, not an assumed delay.
- Every integration helper that starts a server or CLI process must also bound startup, HTTP probes, shutdown, and cleanup; hanging helpers should fail the test and terminate owned processes instead of waiting forever.

## Hotspot Rules

- Split a test file once it starts mixing independent concerns such as:
  - content vs navigation
  - localization vs persistence
  - table sorting vs keyboard row activation
  - chart appearance vs keyboard accessibility
- Reuse the smallest fixture that still proves the behavior.
- Keep deep regression tests separate from baseline component behavior so hot paths stay readable and cheap to run.

## Coverage Scope

`npm run test:vitest:coverage` reports product-runtime coverage. `npm run test:unit:coverage` is kept as the underlying compatibility command. The configured coverage scope intentionally includes frontend runtime modules, the local server runtime, shared runtime contracts, and `usage-normalizer.js` instead of only the historically high-signal frontend subset.

The coverage and timing commands use explicit `dot` and `junit` Vitest reporters. Keep those reporters on both scripts so non-interactive gates emit compact progress and do not depend on silent reporter paths. They intentionally write separate JUnit files, `test-results/vitest-coverage.junit.xml` and `test-results/vitest-timings.junit.xml`, so coverage and timing diagnostics do not contend for the same report path.

The global thresholds are ratchets for that broader denominator:

- Statements: `70`
- Branches: `60`
- Functions: `70`
- Lines: `70`

Some executable entry and orchestration files are expected to stay lower than focused pure modules because subprocess-spawned CLI/server paths are proven by integration, background, and Playwright tests. Treat those gaps as prioritization signals for future focused tests, not as a reason to remove the files from the product-runtime coverage denominator.

## Critical Coverage Targets

Prioritize targeted branch coverage in runtime-heavy modules before adding another broad dashboard regression.

- `src/lib/api.ts`
  - cover success and failure payload handling
  - prefer explicit tests for fallback messages, malformed payloads, and non-OK responses
- `src/hooks/use-usage-data.ts`
  - cover query invalidation and mutation success/error behavior
  - keep these as focused hook tests, not dashboard component tests
- `src/hooks/use-dashboard-controller.ts`
  - cover decision-heavy orchestration such as bootstrap error recovery, report request shaping, backup import/export, and toast side effects
  - prefer mocked hook dependencies with direct controller-hook tests over full `Dashboard` renders unless the UI surface itself is under test
- process and locking helpers
  - keep real subprocess coverage only where shell, `PATH`, CLI startup, or cross-process semantics are the behavior under test
  - use fake children or injected spawn doubles for policy-only branches

## Local Commands

- Required pre-PR gate: run `npm run verify:full` before opening a PR to ensure all tests and checks pass.
- Faster non-coverage fast path on a local machine with enough CPU: `PLAYWRIGHT_TEST_PORT=3016 npm run verify:full:parallel`
- Faster inner-loop gate: `npm run verify`
- Static gate only: `npm run test:static`
- All Vitest projects without coverage: `npm run test:vitest`
- Architecture tests only: `npm run test:architecture`
- Dependency graph gate: `npm run check:deps`
- Coverage-only unit/integration gate: `npm run test:vitest:coverage`
- Per-project timing budget pass: `npm run test:timings:projects`
- Three-run timing benchmark: `npm run test:timings:benchmark`
- Playwright only, with a fresh app build: `PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e:parallel`
- CI-style Playwright smoke: `npm run test:e2e:ci`
- Serial local mirror of the CI gate: `npm run verify:ci`
- Optional parallel local gate without Playwright: `npm run verify:parallel`

## Architecture Guardrails

- Keep hook files under `src/hooks/` reachable from the frontend app entrypoint; `npm run test:architecture` fails on unused production hooks so dead hook helpers do not silently remain at `0%` coverage.
- Timing diagnostics: `npm run test:timings`

`npm run test:timings` generates a fresh Vitest JUnit report, prints the slowest suites and tests, and
lists warning-level timing budget entries. Use it after larger test additions or refactors to catch
new hotspots early.

`npm run test:timings:budget` runs the same Vitest project set with a separate JUnit output and fails
when a suite exceeds `20s` or an individual test exceeds `12s`. These hard limits are intentionally
above the current baseline so they catch pathological regressions without making local and CI runs
fragile under normal CPU variance. CI applies the same hard budget to each Vitest matrix job by
evaluating the JUnit report already produced by that job, so the guard does not add another full
Vitest pass.

Do not run `test:timings` in parallel with another Vitest command that writes the same JUnit file.
`test:timings:budget` uses `test-results/vitest-timing-budget.junit.xml` so it can be run separately
from the diagnostic report when needed.

`npm run test:timings:projects` runs each Vitest project separately, writes project-scoped JUnit files
such as `test-results/vitest-frontend.timing.junit.xml`, and checks the same `20s` suite / `12s`
test hard budget after each project. Use it when you need to identify whether a regression is in
unit, frontend, integration, or background tests without adding another monolithic timing report.

`npm run test:timings:benchmark` repeats the project timing pass three times and prints median and
worst observed duration per project. Use those repeated measurements before changing worker counts
or moving tests between layers; a single run is not enough to separate real improvements from cache,
CPU, or I/O variance. Repeated runs write `timing-run-N` JUnit files so their reports never overwrite
the normal project, coverage, or diagnostic reports.

The frontend Vitest project intentionally uses `maxWorkers: '80%'`. Local Phase-2 measurements showed
that the old `50%` setting left jsdom work under-parallelized, while `100%` saturated the machine and
made imports, setup, tests, and environment time much worse. Re-benchmark with
`npm run test:timings:benchmark -- --projects=frontend` before changing that worker cap.

`npm run verify:parallel` is an optional local fast path. It overlaps the static gate, API
integration tests, and `build:app`, then runs the high-contention suites in separate waves: unit,
frontend/jsdom, architecture, and background-process integration. That keeps the internally
parallel Vitest projects from over-subscribing the same cores and keeps real background servers away
from the jsdom/build storm. `verify:package` runs after those waves succeed.
`npm run verify:full:parallel` adds `test:e2e:ci` to the final wave. The canonical serial gates stay
unchanged; use the parallel gates for local feedback when the machine has enough CPU and the
per-project JUnit report paths must stay isolated. The parallel fast path intentionally avoids a
second coverage-instrumented Vitest pass, so pair it with `npm run test:vitest:coverage` or the
serial `npm run verify:full` when coverage thresholds are part of the validation.

Use `node scripts/run-parallel-gate.js --dry-run --e2e` after changing gate scripts to inspect the
task waves and their declared report outputs before running the expensive full gate. The script
fails before spawning children if two tasks in the same wave declare the same output path, and a
successful run prints a per-task timing summary so local bottlenecks are visible without opening
JUnit reports.

## CI Notes

- Keep workflow test paths aligned with the split test structure.
- The main CI workflow is intentionally a DAG: `static`, Vitest project matrix, `coverage`, and `build` can run independently; `package-smoke` and `e2e` depend only on the `production-dist` artifact from `build`.
- `CI Required` is the stable branch-protection check for `ci.yml`; it runs after every required CI job with `always()` and fails on failed, skipped, or cancelled dependencies.
- Keep CI report artifacts job-scoped so parallel jobs do not overwrite each other. Vitest project jobs upload `test-reports-vitest-<project>`, coverage uploads `coverage-reports`, and Playwright uploads `test-reports-e2e`.
- Each Vitest matrix job evaluates its own JUnit report with `scripts/report-test-timings.js` and the
  same `20s` suite / `12s` test hard budget used by `npm run test:timings:budget`.
- Do not point CI jobs at deleted catch-all files such as old monolithic `server-helpers` or frontend regression suites.
- Windows smoke coverage should stay focused on the small, platform-relevant helper suites rather than full subprocess-heavy integration runs unless the workflow explicitly targets Windows process behavior.

## Review Checklist for New Tests

- Smallest valid test layer chosen
- Shared harness used instead of local provider boilerplate
- Minimal fixture size for the asserted behavior
- `waitFor(...)` only where a real async transition exists
- New hot paths split by concern before the file becomes a catch-all suite
- `npm run test:timings` checked after larger additions or refactors
- critical branch-heavy runtime modules covered with focused tests instead of broad UI catch-all suites
