# Environment Configuration — Phase 3

This document describes the Phase 3 hardening, testing, and documentation for environment config and secret handling.

## Secret handling rules

| Rule | Description |
|---|---|
| Minimum length | All secrets must be at least 12 characters |
| No placeholders | Secrets must not use placeholder values (`change-me`, `your-`, `CHANGE_ME`) |
| Production readiness | All secrets declared in `.env.example` must be replaced in production `.env` |
| Gitignore | `.env` Must be listed in `.gitignore` for every workspace |

## Per-workspace contract

### `@qyou/api`

| Variable | Required | Secret | Production Required | Format |
|---|---|---|---|---|
| `PORT` | Yes | No | Yes | number |
| `DATABASE_URL` | Yes | Yes | Yes | url |
| `JWT_SECRET` | Yes | Yes | Yes | string |
| `JWT_EXPIRES_IN` | Yes | No | Yes | string |

### `@qyou/web`

| Variable | Required | Secret | Production Required | Format |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | No | Yes | url |

### `@qyou/mobile`

| Variable | Required | Secret | Production Required | Format |
|---|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | No | No | No | url |

## Testing

The `env-secret-phase3.test.ts` script validates env files against the Phase 3 contract:

- Required vars present
- Secrets minimum length (12 chars)
- No placeholder values in secrets
- Optional vars may be absent

## Hardening

The `env-secret-hardening-phase3.ts` script checks:

- `.env.example` exists with defaults
- Secrets have minimum length
- No placeholder values in `.env.example` or `.env`
- Secret-like keys (`secret`, `password`, `token`, `key`, `auth`) are detected automatically

## CI pipeline contract

Phase 3 introduces a formal contract for CI pipeline stability:

- All workflows must declare `timeout-minutes`
- All workflows must use pinned action versions (not `@main` or `@master`)
- Workflows must use `npm ci` (not `npm install`)
- Workflow steps must run in logical order (install → lint → test → build)
