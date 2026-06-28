# Lint, Typecheck, and Test — Phase 1

This document describes the Phase 1 behavior of lint, typecheck, and test ergonomics in the Qyou monorepo.

## Overview

Every workspace in the monorepo should declare three standard npm scripts:

- `lint` — Run ESLint
- `typecheck` — Run TypeScript type checking (`tsc --noEmit`)
- `test` — Run the workspace test suite

These scripts are invoked from the root via `--workspaces --if-present`, allowing
`npm run lint` to cascade across all workspaces.

## Workspace requirements

| Workspace | lint | typecheck | test | Test framework | ESLint | tsconfig |
|---|---|---|---|---|---|---|
| `@qyou/api` | ✅ | ✅ | ✅ | node:test | ✅ | ✅ |
| `@qyou/web` | ✅ | ✅ | ✅ | jest | ✅ | ✅ |
| `@qyou/mobile` | ✅ | ✅ | ✅ | jest | ✅ | ✅ |
| `@qyou/shared` | ✅ | ✅ | ❌ | — | ✅ | ✅ |
| `@qyou/stellar` | ✅ | ✅ | ❌ | — | ✅ | ✅ |

## Hardening rules

1. No script should be empty
2. No script should swallow errors (`|| true`, `|| exit 0`)
3. Test scripts must not use `--watch` (hangs in CI)
4. Each workspace must have ESLint config and `tsconfig.json`

## Developer documentation contract

The Phase 1 contract for developer documentation defines:

- Every workspace must have a `docs/` directory
- Required files: `development.md`, `architecture.md`, `testing.md`
- Documentation must be validated in CI

## Local verification

```bash
npm run typecheck
npm run lint
npm run test
```
