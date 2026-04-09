# Contributing

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

## Before Opening a Pull Request

Run the production build and automated checks:

```bash
npm run build
npm run test:unit
npm run test:e2e
```

The Playwright suite uses an isolated local app directory under `.tmp-playwright/` and should not reuse your normal local dashboard data.

Then verify the main flows manually:

- Dashboard load
- Auto-import
- JSON upload
- Filtering
- CSV/PDF export

If you change dependencies, update both lockfiles so npm and Bun installs stay reproducible:

```bash
npm install
bun install --lockfile-only
```

## Style

- Frontend: TypeScript + React, 2-space indentation, single quotes, no semicolons in `src/`
- Server: CommonJS, keep existing semicolon style in `server.js`
- Keep feature UI colocated under `src/components/features/`
