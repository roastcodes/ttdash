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

- `vitest.setup.frontend.ts` is the shared place for `jsdom` defaults such as:
  - i18n bootstrapping
  - `matchMedia`
  - `ResizeObserver`
  - default `IntersectionObserver`
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

## Hotspot Rules

- Split a test file once it starts mixing independent concerns such as:
  - content vs navigation
  - localization vs persistence
  - table sorting vs keyboard row activation
  - chart appearance vs keyboard accessibility
- Reuse the smallest fixture that still proves the behavior.
- Keep deep regression tests separate from baseline component behavior so hot paths stay readable and cheap to run.

## Coverage Scope

`npm run test:unit:coverage` reports product-runtime coverage. The configured coverage scope intentionally includes frontend runtime modules, the local server runtime, shared runtime contracts, and `usage-normalizer.js` instead of only the historically high-signal frontend subset.

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
- Faster inner-loop gate: `npm run verify`
- Architecture tests only: `npm run test:architecture`
- Dependency graph gate: `npm run check:deps`
- Coverage-only unit/integration gate: `npm run test:unit:coverage`
- Playwright only: `PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e`

## Architecture Guardrails

- Keep hook files under `src/hooks/` wired into production code; `npm run test:architecture` fails on unused production hooks so dead hook helpers do not silently remain at `0%` coverage.
- Timing diagnostics: `npm run test:timings`

`npm run test:timings` generates a fresh Vitest JUnit report and prints the slowest suites and tests. Use it after larger test additions or refactors to catch new hotspots early.

Do not run `test:timings` in parallel with another Vitest command that writes the same JUnit file.

## CI Notes

- Keep workflow test paths aligned with the split test structure.
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
