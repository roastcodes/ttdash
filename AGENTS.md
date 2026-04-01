# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite frontend. Use `components/` for UI, grouped by `ui/`, `layout/`, `cards/`, `charts/`, `tables/`, and `features/`. Put shared logic in `lib/`, reusable stateful logic in `hooks/`, and TypeScript shapes in `types/`. Static assets live in `public/`. The production bundle is generated into `dist/`. `server.js` serves `dist/`, exposes `/api`, and handles local data import.

## Build, Test, and Development Commands
Install dependencies with `npm install`.

- `npm run dev`: starts the Vite dev server on port `5173`.
- `node server.js`: runs the local API/static server on port `3000`.
- `npm run build`: creates the production bundle in `dist/`.
- `npm run preview`: serves the built frontend for a production-style check.
- `npm start`: runs the packaged server entrypoint.

During development, keep `npm run dev` and `node server.js` running in separate terminals so `/api` requests resolve correctly.

## Coding Style & Naming Conventions
Frontend code is TypeScript + React. Follow the existing style: 2-space indentation, single quotes, trailing commas where the formatter leaves them, and no semicolons in `src/` files. Component, hook, and type filenames use PascalCase or descriptive kebab-free names such as `Dashboard.tsx`, `use-usage-data.ts`, and `formatters.ts`. Keep utilities small and colocate feature-specific UI under `src/components/features/`. In `server.js`, preserve the current CommonJS style and semicolon usage instead of rewriting it to match the frontend.

## Testing Guidelines
There is no committed automated test suite yet. Before opening a PR, run `npm run build` and manually verify the main flows: dashboard load, auto-import, JSON upload, filtering, and export actions. If you add tests, prefer colocated `*.test.ts` or `*.test.tsx` files and keep them focused on data transforms, hooks, or complex UI behavior.

## Commit & Pull Request Guidelines
Recent history favors short, imperative subjects, often with a version prefix, for example `v5.3.1: Fix timezone bug` or `Fix install.sh -e output`. Keep commits narrowly scoped. PRs should explain the user-visible change, note any manual verification performed, link related issues, and include screenshots or GIFs for UI changes.

## Configuration Tips
Use `PORT=8080 node server.js` to override the default server port. Do not commit generated `dist/` output or local usage data unless the change explicitly requires it.
