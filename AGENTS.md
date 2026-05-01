# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the Vite frontend. Use `components/` for UI, grouped by `ui/`, `layout/`, `cards/`, `charts/`, `tables/`, and `features/`. Put shared logic in `lib/`, reusable stateful logic in `hooks/`, and TypeScript shapes in `types/`. Static assets live in `public/`. The production bundle is generated into `dist/`. `server.js` serves `dist/`, exposes `/api`, and handles local data import.

## Build, Test, and Development Commands

Install dependencies with `npm install`.

- `npm run dev`: starts the Vite dev server on port `5173`.
- `node server.js`: runs the local API/static server on port `3000`.
- `npm run build`: runs `prettier --check`, `eslint`, and then creates the production bundle in `dist/`.
- `npm run build:app`: creates the production bundle in `dist/` without the lint/format gate.
- `npm run verify`: runs the main local quality gate (`format:check`, `lint`, `tsc --noEmit`, unit tests, `build:app`, and `verify:package`).
- `npm run preview`: serves the built frontend for a production-style check.
- `npm start`: runs the packaged server entrypoint.

During development, keep `npm run dev` and `node server.js` running in separate terminals so `/api` requests resolve correctly.

## Coding Style & Naming Conventions

Frontend code is TypeScript + React. Follow the existing style: 2-space indentation, single quotes, trailing commas where the formatter leaves them, and no semicolons in `src/` files. Component, hook, and type filenames use PascalCase or descriptive kebab-free names such as `Dashboard.tsx`, `use-usage-data.ts`, and `formatters.ts`. Keep utilities small and colocate feature-specific UI under `src/components/features/`. In `server.js`, preserve the current CommonJS style and semicolon usage instead of rewriting it to match the frontend.

## Testing Guidelines

Automated tests are part of the repo now. Before opening a PR, run `npm run verify:full`; on a local machine with enough CPU, `PLAYWRIGHT_TEST_PORT=3016 npm run verify:full:parallel` is the faster non-coverage fast path across the main test surfaces. If you only need the main local gate without Playwright, run `npm run verify`. If local port `3015` is already in use, run Playwright with `PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e`. Use `npm run test:timings` to inspect the slowest Vitest suites and cases after larger test changes, but do not run it in parallel with another Vitest command that writes the same JUnit report. Architecture and dependency boundaries are guarded by `npm run test:architecture` and `npm run check:deps`; when you add or move modules, keep [`docs/architecture.md`](docs/architecture.md) aligned with the actual structure.

When adding tests:

- use `tests/unit` for pure logic, transforms, formatting, and small server helpers
- use `tests/frontend` for React/jsdom behavior
- use `tests/integration` for local server, CLI, filesystem, and API behavior without a browser
- use `tests/e2e` only for real browser journeys
- prefer focused `*.test.ts` or `*.test.tsx` files over broad catch-all regression suites
- use the shared helpers in `tests/test-utils.tsx` instead of ad hoc provider wrappers
- use real subprocesses only when shell/PATH/CLI or cross-process behavior is the thing being tested
- split files once they mix unrelated concerns like content, navigation, localization, motion, or keyboard behavior
- keep `waitFor(...)` for real eventual consistency only, not as the default assertion pattern
- keep Playwright specs on `tests/e2e/fixtures.ts` and reset state with `resetAppState(...)` or `prepareDashboard(...)`
- when improving coverage, prefer critical branch-heavy runtime modules like `src/lib/api.ts`, `src/hooks/use-usage-data.ts`, and `src/hooks/use-dashboard-controller.ts` over adding another broad dashboard catch-all test

Continue to manually verify the main flows affected by the change: dashboard load, auto-import, JSON upload, filtering, and export actions.

## Commit & Pull Request Guidelines

Recent history favors short, imperative subjects, often with a version prefix, for example `v5.3.1: Fix timezone bug` or `Fix install.sh -e output`. Keep commits narrowly scoped. PRs should explain the user-visible change, note any manual verification performed, link related issues, and include screenshots or GIFs for UI changes.

## Configuration Tips

Use `PORT=8080 node server.js` to override the default server port. Do not commit generated `dist/` output or local usage data unless the change explicitly requires it.
