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

Run the production build:

```bash
npm run build
```

Then verify the main flows manually:

- Dashboard load
- Auto-import
- JSON upload
- Filtering
- CSV/PDF export

## Style

- Frontend: TypeScript + React, 2-space indentation, single quotes, no semicolons in `src/`
- Server: CommonJS, keep existing semicolon style in `server.js`
- Keep feature UI colocated under `src/components/features/`
