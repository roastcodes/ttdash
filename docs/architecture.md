# Architecture Overview

## System Shape

TTDash is a local-first product with two runtime parts:

- a Node-based CLI and HTTP server exposed through `server.js`
- a Vite/React frontend bundled into `dist/`

The server owns local persistence, background instance management, auto-import execution and the HTTP API. The frontend owns interaction, filtering, visualization and user-driven import/export flows.

## Architectural Boundaries

### Shared Domain

`shared/dashboard-domain.js` is the common source of truth for model normalization, provider resolution, filter application, aggregation and core dashboard metrics. It is used by:

- frontend data transforms and calculations in `src/lib/*`
- server-side PDF report generation in `server/report/*`

This boundary exists to keep dashboard and report output aligned for the same underlying data.

### Frontend Page Composition

The dashboard page is split into:

- `src/hooks/use-dashboard-controller.ts` for query orchestration, local UI state and user actions
- `src/components/dashboard/DashboardSections.tsx` for section rendering and layout composition
- `src/components/Dashboard.tsx` as the thin page shell

The shell is responsible for state branching only:

- loading
- fatal local-state error
- empty state
- main dashboard

### Settings Contract

Dashboard preferences are driven by `shared/dashboard-preferences.json`, which is consumed by both:

- `src/lib/dashboard-preferences.ts`
- `server.js`

Frontend settings normalization lives in `src/lib/app-settings.ts`. Bootstrap loading is centralized in `src/lib/api.ts` through `loadBootstrapSettings()`.

## Current Server Structure

`server.js` is still the public entrypoint and still owns several runtime responsibilities. The current refactor reduces contract drift and shared-domain duplication first, while keeping the published CLI stable. Further modularization of the server runtime should continue from the current seams:

- runtime/bootstrap
- persistence/settings
- background instance lifecycle
- HTTP helpers and route handlers
- auto-import execution

## Release and Packaging

The npm package ships:

- `server.js`
- `server/`
- `shared/`
- `dist/`
- `src/locales/`

`shared/` is published because the report layer depends on the same domain logic as the frontend bundle.
