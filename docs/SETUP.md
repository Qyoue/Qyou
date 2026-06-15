# Environment Setup

This document describes the environment variables and local configuration needed to run each
app in this monorepo.

## Required environment variables

### `apps/api`

Copy `apps/api/.env.example` to `apps/api/.env`:

| Variable          | Description                                              | Example                                                      |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| `PORT`            | Port the API listens on                                    | `4000`                                                        |
| `DATABASE_URL`    | PostgreSQL connection string used by Prisma               | `postgresql://postgres:postgres@localhost:5432/qyou?schema=public` |
| `JWT_SECRET`      | Secret used to sign access tokens                          | a long random string                                          |
| `JWT_EXPIRES_IN`  | Access token lifetime (jsonwebtoken `expiresIn` format)    | `1h`                                                           |

All of these have safe development defaults baked into `src/shared/config/env.ts`, so the API
and its tests run without a `.env` file. A real `DATABASE_URL` is only required to run the API
against PostgreSQL (e.g. `npm run dev -w @qyou/api`) — the auth tests use an in-memory
repository and need no database.

### `apps/web`

Copy `apps/web/.env.example` to `apps/web/.env.local`:

| Variable               | Description                              | Example                 |
| ----------------------- | ----------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`   | Base URL of `apps/api`                    | `http://localhost:4000` |

### `apps/mobile`

Copy `apps/mobile/.env.example` to `apps/mobile/.env`:

| Variable               | Description                                                | Example                 |
| ----------------------- | ------------------------------------------------------------ | ------------------------ |
| `EXPO_PUBLIC_API_URL`   | Base URL of `apps/api` (reserved for future mobile auth work) | `http://localhost:4000` |

## Local database

`apps/api` uses Prisma with PostgreSQL. To run the API against a real database:

1. Start a local PostgreSQL instance and set `DATABASE_URL` accordingly.
2. From `apps/api`, run `npx prisma migrate dev` to create the `users` table.

## Secrets handling

* `.env*` files are gitignored — never commit real secrets.
* `.env.example` files document required variables with safe placeholder values only.
* Use a long, randomly generated `JWT_SECRET` in any shared, staging, or production environment.
