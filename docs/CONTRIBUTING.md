# Contributing

## Coding standards

* TypeScript strict mode is enabled everywhere — fix type errors rather than widening types or
  using `any`.
* Linting is enforced via the root `eslint.config.mjs` (run with `npm run lint -w <workspace>` or
  `npm run lint` for everything). Formatting is enforced via Prettier (`npm run format`).
* Favor small, focused modules over large files. Avoid speculative abstractions, unused
  configuration, and placeholder code for features that don't exist yet.

## Project structure

```text
apps/
├── api/      Express modular monolith — authentication API
├── web/      Next.js — login & create-account pages
└── mobile/   Expo + React Native — project foundation only

packages/
├── shared/   Shared validation schemas (zod) and auth types
└── stellar/  Scaffold for the future Stellar integration package
```

### `apps/api` — modular monolith

The backend is organized by business module, not by technical layer:

```text
src/
├── modules/
│   └── auth/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── validators/
│       ├── routes/
│       ├── types/
│       └── tests/
├── shared/
│   ├── config/
│   ├── database/
│   ├── middleware/
│   ├── errors/
│   ├── logger/
│   └── types/
├── app.ts
└── server.ts
```

Each module owns its controllers, services, repository access, validation, types, and tests.
Cross-cutting infrastructure (env config, Prisma client, error types, middleware, logging) lives
in `src/shared/` — business logic must not live there. When adding a new module, follow the same
shape as `modules/auth`.

### `apps/web`

App Router pages live in `src/app/<route>/page.tsx`. Reusable UI lives in `src/components/`, and
cross-cutting client logic (auth state, API client) lives in `src/lib/`.

### `apps/mobile`

This app is a foundation only — `src/components`, `src/screens`, `src/navigation`, `src/hooks`,
`src/services`, and `src/utils` are scaffolded but intentionally empty, ready for future feature
work without restructuring.

### `packages/shared`

Holds validation schemas and TypeScript types shared between `apps/api` and `apps/web`. Add new
shared contracts here rather than duplicating them per app.

### `packages/stellar`

A placeholder package for the future Stellar integration. Do not add blockchain logic here until
that work is explicitly scoped.

## Development workflow

1. `npm install` — installs all workspaces and builds `@qyou/shared` and `@qyou/stellar` via
   `postinstall`.
2. `npm run dev` — runs `@qyou/api`, `@qyou/web`, and `@qyou/mobile` together (or
   `npm run dev -w <workspace>` for a single app).
3. Before opening a PR, run `npm run lint`, `npm run typecheck`, and `npm run test`. CI runs the
   same checks per package.

## Contribution expectations

* New backend modules follow the `modules/<name>/{controllers,services,repositories,validators,routes,types,tests}`
  structure used by `modules/auth`.
* Shared types or validation schemas used by more than one app belong in `packages/shared`.
* Keep changes scoped to the relevant package(s) — avoid mixing unrelated changes across
  `apps/api`, `apps/web`, and `apps/mobile` in a single PR.
* Do not implement features outside this repository's current scope (monorepo setup +
  authentication) without first discussing the change.
* Add or extend tests for any new behavior.
