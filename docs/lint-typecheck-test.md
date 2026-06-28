# Lint, Typecheck, and Test Ergonomics

This document describes the ergonomic setup for running lint, typecheck, and test across the Qyou monorepo.

## Quick commands

```bash
# Run all checks across every workspace
npm run lint
npm run typecheck
npm run test

# Single workspace
npm run lint -w @qyou/api
npm run typecheck -w @qyou/web
npm run test -w @qyou/mobile
```

## Per-workspace tooling

| Workspace | Linter | Type checker | Test runner | Config files |
|---|---|---|---|---|
| `@qyou/api` | ESLint | tsc | node:test | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/web` | ESLint | tsc | Jest | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/mobile` | ESLint | tsc | Jest | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/shared` | ESLint | tsc | — | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/stellar` | ESLint | tsc | — | `eslint.config.mjs`, `tsconfig.json` |

## Ergonomics

### Root-level shortcuts

The root `package.json` provides `--workspaces --if-present` delegation:

```
npm run lint   → runs eslint in every workspace that declares a "lint" script
npm run typecheck → runs tsc --noEmit in every workspace that declares a "typecheck" script
npm run test   → runs tests in every workspace that declares a "test" script
```

### Workspace-level conventions

- Every workspace **must** declare a `lint` script.
- Workspaces with runtime code (`api`, `web`, `mobile`) **must** declare `typecheck` and `test`.
- Shared packages (`shared`, `stellar`) should declare `typecheck` and `lint` but may omit `test`.

### Failure handling

- All lint/typecheck/test scripts run sequentially within each workspace.
- A failure in one workspace blocks subsequent workspaces (root `--workspaces --if-present` behavior).
- For CI, each workspace gets its own workflow job for parallel execution.

## Hardening

The `lint-typecheck-hardening.ts` script performs these checks:

- Verifies `tsconfig.json` exists for each workspace
- Verifies at least one ESLint config file exists
- Validates that lint/typecheck/test scripts are non-empty
- Checks for valid JSON in `package.json`
