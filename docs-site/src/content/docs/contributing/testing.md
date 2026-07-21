---
title: Testing
description: Choose the narrowest TTDash test layer, use shared fixtures, and run the right quality gate.
---

TTDash uses four product test layers plus executable architecture and documentation checks. Add coverage at the narrowest layer that can falsify the behavior.

## Test layers

| Location            | Use it for                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `tests/unit`        | Pure logic, transforms, formatting, domain rules, and small server helpers                 |
| `tests/frontend`    | React/jsdom state, accessibility, localization, motion, and chart wiring                   |
| `tests/integration` | Local server, CLI, filesystem, persistence, API, and subprocess behavior without a browser |
| `tests/e2e`         | Real browser journeys across multiple application surfaces                                 |

Docker smoke testing is intentionally separate because it builds and starts the real image and Compose topology.

## Choose the smallest effective test

- Use unit tests when no DOM, server, or filesystem effect is required.
- Prefer frontend/jsdom tests for rendered behavior and component accessibility.
- Use integration tests when the server, CLI, filesystem, or process boundary is the actual behavior.
- Reserve Playwright for flows that require a real browser.
- Use a real subprocess only for shell/PATH resolution, CLI startup, background coordination, or cross-process locking.

Policy-only timeout, stderr, and lifecycle branches should use injected child-process doubles. Real processes need bounded startup, probes, shutdown, and cleanup.

## Shared test infrastructure

- `renderWithAppProviders(...)` supplies the shared frontend provider harness.
- `renderHookWithQueryClient(...)` supplies a query client for focused hook tests.
- Recharts test utilities provide valid SVG mocks for chart internals.
- Playwright specs import the shared fixtures and reset state with `resetAppState(...)` or `prepareDashboard(...)`.
- Browser authentication, seeding, downloads, and server control stay in shared E2E helpers.

Do not create local provider wrappers or one-off process harnesses when a shared helper already owns the contract.

## Async assertions

- Prefer direct assertions after a deterministic action.
- Use `findBy...` when one concrete asynchronous DOM state will appear.
- Use `waitFor(...)` only for genuine eventual consistency such as hook transitions, observers, or external process state.
- Prefer explicit readiness/release signals over fixed sleeps in subprocess tests.

## Documentation checks

Public documentation is treated as a tested product surface:

- Astro type/content validation
- Markdown linting
- internal link and heading validation
- explicit publication-boundary validation
- Playwright navigation, search, theme, mobile, direct-route, and 404 smoke tests
- axe checks on representative pages
- weekly external-link diagnostics

These checks prevent private local files from entering the artifact and catch documentation drift during ordinary pull requests.

## Local commands

For documentation-only work:

```bash
npm run docs:verify
npm run test:docs:e2e
```

For the full application:

```bash
# Main pre-PR gate, including browser tests.
npm run verify:full

# Main local gate without Playwright.
npm run verify

# Static checks only.
npm run test:static

# All Vitest projects without coverage.
npm run test:vitest

# Architecture and dependency boundaries.
npm run test:architecture
npm run check:deps

# Real Docker image/Compose smoke test.
npm run test:docker
```

On a local machine with enough CPU, the non-coverage parallel path is:

```bash
PLAYWRIGHT_TEST_PORT=3016 npm run verify:full:parallel
```

Use `npm run test:timings` after larger test changes. Do not run it in parallel with another Vitest command that writes the same JUnit report.

## Coverage priorities

Prefer critical branch-heavy runtime modules over broad dashboard catch-all tests:

- API payload success and failure handling
- usage query invalidation and mutation behavior
- dashboard controller recovery, report shaping, backup workflows, and toasts
- persistence locks and process coordination
- security guard and authentication branches

Global coverage thresholds apply to the product runtime. Executable entrypoints and orchestration may be proven partly by integration and E2E tests, but they remain useful signals rather than being silently excluded.

## CI contract

The main CI workflow runs static checks, architecture, Vitest projects, coverage, build, package smoke, browser tests, and documentation as an explicit DAG. `CI Required` is the stable aggregate check used by branch protection.

Keep report artifacts job-scoped, keep test paths aligned with the split test structure, and update the aggregate job whenever a required surface is added. A successful main build invokes the separate least-privilege Pages deployment using the exact tested commit.

## Review checklist

- The smallest valid test layer was chosen.
- Shared fixtures and providers are reused.
- The fixture is no larger than the asserted behavior requires.
- `waitFor(...)` covers a real transition.
- New process tests have deterministic cleanup and timeouts.
- New modules preserve architecture boundaries and have focused coverage.
- User-visible runtime changes update the matching public documentation.
