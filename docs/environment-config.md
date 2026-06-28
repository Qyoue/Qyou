# Environment Configuration

This document describes how environment configuration is managed across the Qyou monorepo.

## Per-workspace variables

### `@qyou/api`

| Variable | Required | Secret | Default | Description |
|---|---|---|---|---|
| `PORT` | Yes | No | `4000` | API server port |
| `DATABASE_URL` | Yes | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Yes | `dev-secret-change-me` | Secret for signing access tokens |
| `JWT_EXPIRES_IN` | Yes | No | `1h` | Access token lifetime |

### `@qyou/web`

| Variable | Required | Secret | Default | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | No | `http://localhost:4000` | Base URL of the API |

### `@qyou/mobile`

| Variable | Required | Secret | Default | Description |
|---|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | No | No | `http://localhost:4000` | Base URL of the API (reserved) |

## File conventions

Each workspace follows these conventions:

1. **`.env.example`** — committed to the repo. Contains all variables with placeholder or
   development defaults. Never contains real secrets.
2. **`.env`** — never committed (gitignored). Created by each developer from `.env.example`.
   Contains actual values for the local environment.
3. **`.env.production`** — never committed. Used in production deployments.

## Secret handling rules

- Secrets (marked in the contract) must be at least 8 characters.
- Secrets should not use obvious placeholder values like `change-me` in production.
- `JWT_SECRET` uses `dev-secret-change-me` as a dev default — must be changed in production.
- Never commit a `.env` file containing real credentials.

## Hardening

The `env-config-hardening.ts` script performs these checks:

- Ensures `.env.example` exists for every workspace
- Ensures `.env` is gitignored (checks `.gitignore`)
- Detects placeholder values (e.g., `change-me`, `your-`)
- Warns on short secrets (<8 chars)
- Warns on secrets using `dev-` prefix
- Flags vars defined in `.env.example` without defaults that are missing from `.env`
