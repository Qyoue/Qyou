# CI Pipeline

This document describes the CI pipeline workflows in the Qyou monorepo and their expected behavior.

## Workflow overview

| Workflow file | Scope | Steps | Trigger |
|---|---|---|---|
| `backend.yml` | `@qyou/api` | install → lint → test → build | push, PR |
| `web.yml` | `@qyou/web` | install → lint → test → build | push, PR |
| `mobile.yml` | `@qyou/mobile` | install → typecheck → lint → test | push, PR |
| `packages.yml` | `@qyou/shared`, `@qyou/stellar` | install → build → lint | push, PR |

## Pipeline phases

### Install
All workflows run `npm ci` with Node 20 and npm caching. This installs all workspace dependencies
and runs the root `postinstall` script, which builds `@qyou/shared` and `@qyou/stellar` first.

### Lint
Each workspace runs `eslint` via `npm run lint -w <workspace>`. The root `eslint.config.mjs` applies
TypeScript strict rules and React-specific rules for `apps/web` and `apps/mobile`.

### Test
- `@qyou/api`: Node built-in test runner (`node --import tsx --test`) with in-memory auth repository
  — no database required
- `@qyou/web` and `@qyou/mobile`: Jest with framework-specific presets
- `@qyou/shared` and `@qyou/stellar`: No runtime tests — CI validates build + lint instead

### Build
- `@qyou/api`: `tsc -p tsconfig.json` outputs to `dist/`
- `@qyou/web`: `next build` outputs to `.next/`
- `@qyou/mobile`: No build step (Expo/React Native build is handled separately)
- `@qyou/shared` and `@qyou/stellar`: `tsc -p tsconfig.json` outputs to `dist/`

## Failure behavior

- Any step that returns a non-zero exit code fails the workflow and blocks the PR.
- All workflows run in parallel. A failure in one workflow does not affect the others.
- The `packages.yml` workflow uses a build matrix to test `@qyou/shared` and `@qyou/stellar`
  independently.

## Running CI locally

```bash
# Run all checks
npm run lint
npm run typecheck
npm run test

# Single workspace
npm run lint -w @qyou/api
npm run test -w @qyou/web
```
