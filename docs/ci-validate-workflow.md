# CI Validate Workflow

## Overview

The monorepo ships a single `validate` script that runs lint, tests, and type-checking in sequence.
This document describes how to run it locally and how it maps to the CI pipeline.

## Running Locally

```bash
npm run validate
```

This runs:
1. `npm run lint` — ESLint across all workspaces that have a lint script
2. `npm run test` — Node.js built-in test runner for `apps/api`
3. `npm run typecheck` — TypeScript `--noEmit` for `stellar/client` and `apps/api`

## CI Pipeline (`.github/workflows/ci.yml`)

The `validate` job runs on every pull request and push to `main` or `develop`.

Steps:
1. Checkout code
2. Setup Node.js (v20) with npm cache
3. `npm install --workspaces --include-workspace-root --no-audit --no-fund`
4. `npm run lint`
5. `npm run test`
6. `npm run typecheck`

## Required Environment Variables

The CI workflow injects these environment variables for the validate run:

| Variable | Purpose |
|---|---|
| `API_PORT` | API server port (used by validate-env) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh signing secret (min 32 chars) |
| `STELLAR_NETWORK` | `TESTNET` or `MAINNET` |
| `STELLAR_SECRET_KEY` | Stellar keypair secret |
| `NEXT_PUBLIC_API_URL` | Admin web API base URL |
| `ADMIN_JWT_SECRET` | Admin web session secret |
| `EXPO_PUBLIC_API_URL` | Mobile app API base URL |

In CI these are set as workflow-level `env` values. Locally, copy `.env.example` to `.env`.

## Per-Workspace Typecheck

Each workspace exposes a `typecheck` script:

| Workspace | Command |
|---|---|
| `stellar/client` | `npm run typecheck --workspace=stellar/client` |
| `apps/api` | `npm run typecheck --workspace=apps/api` |
| `apps/admin-web` | `npm run typecheck --workspace=apps/admin-web` |
| `apps/mobile` | `npm run typecheck --workspace=apps/mobile` |

The root `typecheck` script (`scripts/typecheck-workspaces.cjs`) runs `stellar/client` and `apps/api`
with the required env injected. Admin-web and mobile are skipped in the root script because they
rely on build-driven type validation, but their `typecheck` scripts can be run individually.

## Adding a New Workspace

1. Add a `typecheck` script to the workspace `package.json`.
2. If the workspace needs env vars, add an entry to `scripts/typecheck-workspaces.cjs`.
3. Ensure the workspace has a `lint` script if it uses ESLint.
