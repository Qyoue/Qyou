# Environment Config and Secret Handling — Phase 5 Behavior

## Overview

The Phase 5 environment config and secret handling contract defines the expected
environment variable definitions, secret rotation policies, audit logging, and
encryption requirements across the Qyou monorepo.

## Contract Structure

The contract (`env-secret-contract-phase5.ts`) exports:

- **`EnvSecretPhase5Contract`** — per-workspace contract type
- **`ENV_SECRET_PHASE5_CONTRACTS`** — contract instances for 3 workspaces + root
- **`getEnvSecretPhase5Contract(name)`** — lookup helper
- **`validateEnvSecretPhase5(contract)`** — validation function

## Workspace Contracts

| Workspace | Env Vars | Secrets | Rotations |
|-----------|----------|---------|-----------|
| `@qyou/api` | 5 | 3 | 60–90 days |
| `@qyou/web` | 2 | 1 | 180 days |
| `@qyou/mobile` | 1 | 0 | N/A |
| `root` | 1 | 1 | 90 days |

## Environment Variables

### @qyou/api
| Variable | Required | Secret | Format | Rotation | Min Length |
|----------|----------|--------|--------|----------|------------|
| `PORT` | yes | no | number | — | — |
| `DATABASE_URL` | yes | yes | url | 90 days | 20 |
| `JWT_SECRET` | yes | yes | string | 60 days | 32 |
| `JWT_EXPIRES_IN` | yes | no | string | — | — |
| `REDIS_URL` | no | yes | url | 90 days | 16 |

### @qyou/web
| Variable | Required | Secret | Format | Rotation | Min Length |
|----------|----------|--------|--------|----------|------------|
| `NEXT_PUBLIC_API_URL` | yes | no | url | — | — |
| `NEXT_PUBLIC_SENTRY_DSN` | no | yes | url | 180 days | 20 |

### @qyou/mobile
| Variable | Required | Secret | Format |
|----------|----------|--------|--------|
| `EXPO_PUBLIC_API_URL` | no | no | url |

### root
| Variable | Required | Secret | Format | Rotation | Min Length |
|----------|----------|--------|--------|----------|------------|
| `NPM_TOKEN` | no | yes | string | 90 days | 16 |

## Secret Rotation Policy

- **Default rotation**: 90 days
- **Notification window**: 14 days before rotation
- **Short-lived secrets**: JWT_SECRET rotates every 60 days
- **Infrastructure secrets**: DATABASE_URL, REDIS_URL rotate every 90 days

## Audit Logging

| Requirement | API | Web | Mobile | Root |
|-------------|-----|-----|--------|------|
| Log access | yes | yes | no | yes |
| Log changes | yes | yes | yes | yes |
| Retention | 365 days | 365 days | 90 days | 365 days |

## Encryption

- **Algorithm**: AES-256-GCM
- **Key rotation**: 180 days
- **Encrypted files**: `.env.encrypted` for API, Web, and Root
- **Secrets requiring encryption**: DATABASE_URL, JWT_SECRET, REDIS_URL, NPM_TOKEN

## Validation Rules

- `.env.example` file must exist for all workspaces
- `.gitignore` must reference `.env` files
- All secrets must have a rotation policy defined
- All secrets must have a minimum length defined
- Secret rotation must be enabled
- Secret format validation must be configured
