# Contributing

Thanks for your interest in `TTDash`.

This project is currently maintained by a single maintainer. Contributions are welcome, but acceptance is selective so the codebase, scope, and release quality stay manageable.

## What Is Most Helpful

The easiest changes to review and merge are:

- reproducible bug reports
- documentation fixes and clarifications
- focused bugfix pull requests
- small UX or accessibility improvements
- tests that cover existing or clearly agreed behavior

Please open an issue before spending time on larger changes such as:

- new features
- architectural refactors
- dependency swaps
- changes to import, persistence, or reporting behavior
- broad UI redesigns

Large unsolicited pull requests may be declined even if they are technically correct, simply because they do not fit the current direction or available review time.

## Before You Open an Issue

Please include enough detail for the problem to be actionable:

- what you expected
- what actually happened
- exact steps to reproduce
- sample input data if the bug depends on input shape
- screenshots or terminal output when helpful
- environment details when relevant: OS, Node version, install method, browser

For feature requests, explain the user problem first. Suggestions that only describe an implementation without clarifying the problem are harder to evaluate.

## Before You Open a Pull Request

Make sure the change is small, focused, and aligned with the existing product direction.

Run the full local gate before opening a PR:

```bash
npm run verify:full
```

On a local machine with enough CPU, the staged parallel gate gives faster feedback across the same
main test surfaces without the coverage-instrumented pass:

```bash
PLAYWRIGHT_TEST_PORT=3016 npm run verify:full:parallel
```

Do not use the parallel fast path as a replacement for the final coverage gate when a change affects
coverage thresholds; keep `npm run verify:full` or `npm run test:vitest:coverage` in that validation.

`npm run verify` remains the faster non-browser gate for inner-loop work. It covers formatting,
ESLint, `tsc --noEmit`, Vitest without coverage instrumentation, the production bundle, and
packaged-artifact verification.

If you only need the production bundle without the lint/format gate, use:

```bash
npm run build:app
```

If local port `3015` is already occupied, run the stable Playwright smoke on another isolated port:

```bash
PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e:ci
```

The Playwright suite starts an isolated local app per worker under `.tmp-playwright/workers/` and
should not reuse your normal local dashboard data. Use `npm run test:e2e` only when you intentionally
want the fresh app build plus the default local worker count. `npm run verify:package` builds the
real tarball and verifies that the packaged CLI can start outside the repo checkout.

Then manually verify the main user flows touched by your change:

- dashboard load
- auto-import
- JSON upload
- filtering
- CSV/PDF export when relevant

If you change dependencies, update both lockfiles so npm and Bun installs stay reproducible:

```bash
npm install
bun install --lockfile-only
```

## Pull Request Expectations

Good pull requests are:

- narrowly scoped
- easy to review commit-by-commit
- consistent with the existing code style
- explicit about user-visible behavior changes

Please include:

- a short summary of the change
- why the change is needed
- how you tested it
- screenshots or terminal output for UI/CLI changes when helpful

## Development Setup

```bash
npm install
npm run dev
node server.js
```

Or with Bun:

```bash
bun install
bun run dev
node server.js
```

The frontend dev server runs on `http://localhost:5173` and the local API/static server runs on `http://localhost:3000`.

## Style

- Frontend: TypeScript + React, 2-space indentation, single quotes, no semicolons in `src/`
- Server: CommonJS, keep existing semicolon style in `server.js`
- Keep feature UI colocated under `src/components/features/`
- Prefer small, targeted changes over broad cleanup refactors

## Related Docs

- Release process: [`RELEASING.md`](RELEASING.md)
- Security reporting: [`SECURITY.md`](SECURITY.md)
- Conduct expectations: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
