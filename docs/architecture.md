# Architecture Guardrails

TTDash uses three complementary architecture gates. Each tool owns a different structural concern so the repo gets stronger boundaries without duplicating the same rule in multiple places.

## Tool Responsibilities

- `dependency-cruiser`
  - owns whole-repo dependency graph health
  - enforces production dependency boundaries and cycle checks
- `eslint-plugin-boundaries`
  - owns fast frontend import-layer discipline inside `src/**`
  - keeps hooks, `lib`, and UI layers pointed in the intended direction
  - also ensures every production file in `src/**` belongs to a known frontend layer
- `archunit`
  - owns small, executable architecture tests that are easier to express as rules than as lint config
  - covers runtime boundaries, hook naming, and other intentional structural constraints

## Runtime Dependency Model

- `src/**`
  - frontend-only code
  - may depend on `shared/**`
  - must not depend on `server/**` or `server.js`
- `server/**` and `server.js`
  - local API, reporting, background process, and package runtime
  - may depend on `shared/**`
  - must not depend on `src/**`
- `shared/**`
  - neutral runtime/domain utilities and shared assets
  - must not depend on `src/**`, `server/**`, `server.js`, or `usage-normalizer.js`
- `usage-normalizer.js`
  - standalone normalization logic
  - must stay independent from frontend and server modules

## Frontend Layer Model

- `app-shell`
  - `src/App.tsx`
  - `src/main.tsx`
- `components`
  - `src/components/**`
- `hooks`
  - `src/hooks/**`
- `lib-react`
  - `src/lib/**/*.tsx`
- `lib-core`
  - `src/lib/**/*.ts`
- `types`
  - `src/types/**`

Important expectations:

- generic UI primitives belong in `src/components/ui/**`, not inside feature folders
- hooks must not import components
- `lib-core` stays free of React, Recharts, Radix, Framer Motion, and React Query
- if a helper becomes shared across multiple features, move it into a neutral shared location instead of layering more exceptions on top

Current `eslint-plugin-boundaries` stance:

- enabled:
  - `boundaries/dependencies`
  - `boundaries/no-unknown`
  - `boundaries/no-unknown-files`
- intentionally not enabled:
  - `boundaries/entry-point`
  - `boundaries/no-private`

Reason: the repo has stable layer boundaries, but it is not structured around strict public barrel entrypoints. Enabling `entry-point` or `no-private` now would add config noise and refactor pressure without a proportional architecture gain.

## Commands

- dependency graph validation: `npm run check:deps`
- dependency graph visualization: `npm run deps:graph`
- architecture tests only: `npm run test:architecture`
- main release-style local gate: `npm run verify:full`

Both `ci.yml` and `release.yml` run `check:deps` and `test:architecture` explicitly so dependency and architecture violations show up as separate CI failures instead of being hidden inside a larger local gate.

## Contributor Rules

- Add a new rule only when it protects a real structural boundary the repo already intends to keep.
- Prefer the narrowest tool:
  - use `dependency-cruiser` for whole-repo dependency graph boundaries
  - use `eslint-plugin-boundaries` for frontend import discipline
  - use `archunit` for expressive architecture assertions and naming rules
- Do not add broad allowlists just to get green. Fix the code or scope the rule explicitly.
- If a feature helper becomes cross-feature, move it out of `src/components/features/**` before adding more exceptions.
