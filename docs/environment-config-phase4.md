# Environment Config and Secret Handling — Phase 4

This document describes the Phase 4 environment configuration and secret handling requirements.

## Workspace Contracts

| Workspace | Env Vars | Secrets | Rotation Days |
|-----------|----------|---------|---------------|
| Root | 1 | 1 | 90 |
| `@qyou/api` | 5 | 3 | 90 |
| `@qyou/web` | 2 | 1 | 180 |
| `@qyou/mobile` | 1 | 0 | 90 |

## Environment Variable Requirements

### Root
| Variable | Required | Secret |
|----------|----------|--------|
| `NPM_TOKEN` | no | yes |

### @qyou/api
| Variable | Required | Secret | Format |
|----------|----------|--------|--------|
| `PORT` | yes | no | number |
| `DATABASE_URL` | yes | yes | url |
| `JWT_SECRET` | yes | yes | string |
| `JWT_EXPIRES_IN` | yes | no | string |
| `REDIS_URL` | no | yes | url |

### @qyou/web
| Variable | Required | Secret | Format |
|----------|----------|--------|--------|
| `NEXT_PUBLIC_API_URL` | yes | no | url |
| `NEXT_PUBLIC_SENTRY_DSN` | no | yes | url |

### @qyou/mobile
| Variable | Required | Secret | Format |
|----------|----------|--------|--------|
| `EXPO_PUBLIC_API_URL` | no | no | url |

## Secret Management

- Default rotation period: 90 days
- Minimum secret length: 16 characters (12 for web/mobile)
- Placeholder values like `your-secret` or `changeme` are flagged
- `.env` files are excluded from version control via `.gitignore`

## Validation

Run the Phase 4 env/secret workflow:

```bash
node scripts/env-secret-workflow-phase4.ts
```

Run hardening checks:

```bash
node scripts/env-secret-hardening-phase4.ts
```
